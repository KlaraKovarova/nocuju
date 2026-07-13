/**
 * Source-of-origin audit for the `places` table.
 *
 * Why: the seed (before NOC-86) populated the table with fabricated rows
 * (source="manual", sourceUrl="seed://..."). The board flagged these as
 * trust-destroying and asked us to delete every record without a verifiable
 * origin. This module classifies rows and (when explicitly confirmed) removes
 * the fabricated ones.
 */
import { and, eq, like } from "drizzle-orm";

import { db } from "@/db/client";
import {
  placeAmenities,
  placeCategories,
  placeImages,
  placeReports,
  placeVisits,
  places,
} from "@/db/schema";

export type SourceTag = "verifiable" | "fabricated" | "unsourced";

export type AuditRow = {
  id: number;
  slug: string;
  name: string;
  source: string;
  sourceUrl: string | null;
  tag: SourceTag;
};

export type AuditSummary = {
  total: number;
  verifiable: number;
  fabricated: number;
  unsourced: number;
  rows: AuditRow[];
};

function classify(source: string, sourceUrl: string | null): SourceTag {
  if (sourceUrl && sourceUrl.startsWith("seed://")) return "fabricated";
  if (source === "boudy.info" || source === "viaczechia") return "verifiable";
  if (sourceUrl && /^https?:\/\//i.test(sourceUrl)) return "verifiable";
  return "unsourced";
}

export async function auditPlaces(): Promise<AuditSummary> {
  const rows = await db
    .select({
      id: places.id,
      slug: places.slug,
      name: places.name,
      source: places.source,
      sourceUrl: places.sourceUrl,
    })
    .from(places)
    .orderBy(places.source, places.slug);

  const audit: AuditRow[] = rows.map((r) => ({
    id: Number(r.id),
    slug: r.slug,
    name: r.name,
    source: r.source,
    sourceUrl: r.sourceUrl,
    tag: classify(r.source, r.sourceUrl),
  }));

  return {
    total: audit.length,
    verifiable: audit.filter((r) => r.tag === "verifiable").length,
    fabricated: audit.filter((r) => r.tag === "fabricated").length,
    unsourced: audit.filter((r) => r.tag === "unsourced").length,
    rows: audit,
  };
}

export type CleanupResult = {
  deletedCount: number;
  deletedSlugs: string[];
};

export async function cleanupSeedPlaces(): Promise<CleanupResult> {
  const target = await db
    .select({
      id: places.id,
      slug: places.slug,
    })
    .from(places)
    .where(like(places.sourceUrl, "seed://%"));

  for (const row of target) {
    const placeId = Number(row.id);
    await db.delete(placeImages).where(eq(placeImages.placeId, placeId));
    await db.delete(placeCategories).where(eq(placeCategories.placeId, placeId));
    await db.delete(placeAmenities).where(eq(placeAmenities.placeId, placeId));
    await db.delete(placeReports).where(eq(placeReports.placeId, placeId));
    await db.delete(places).where(eq(places.id, placeId));
  }

  return {
    deletedCount: target.length,
    deletedSlugs: target.map((r) => r.slug),
  };
}

export type MergedDuplicate = {
  keptId: number;
  keptSlug: string;
  deletedId: number;
  deletedSlug: string;
  movedVisits: number;
  droppedDuplicateVisits: number;
  movedReports: number;
  movedImages: number;
};

export type MergeDuplicatesResult = {
  merged: MergedDuplicate[];
};

/**
 * Merge viaczechia places that share identical coordinates (NOC-103).
 *
 * The viaczechia listing repeats a útulna once per trail section, sometimes
 * with a different mapy.cz short link, and the crawler used to dedupe only by
 * source_url — producing two rows for one physical place. The crawler now
 * dedupes by coordinates too; this one-shot merge repairs rows created before
 * that fix. Keeps the lowest id, moves dependent rows over, deletes the rest.
 * Descriptions are refreshed by re-running the crawl afterwards.
 */
export async function mergeViaczechiaCoordinateDuplicates(): Promise<MergeDuplicatesResult> {
  const rows = await db
    .select({ id: places.id, slug: places.slug, lat: places.lat, lng: places.lng })
    .from(places)
    .where(eq(places.source, "viaczechia"))
    .orderBy(places.id);

  const byCoord = new Map<string, Array<{ id: number; slug: string }>>();
  for (const r of rows) {
    const key = `${r.lat},${r.lng}`;
    const group = byCoord.get(key) ?? [];
    group.push({ id: Number(r.id), slug: r.slug });
    byCoord.set(key, group);
  }

  const merged: MergedDuplicate[] = [];

  for (const group of byCoord.values()) {
    if (group.length < 2) continue;
    const [keeper, ...dupes] = group;

    for (const dupe of dupes) {
      // Visits carry a (place_id, user_id, visited_on) unique index — move
      // each row unless the keeper already has that user+day, then drop it.
      let movedVisits = 0;
      let droppedDuplicateVisits = 0;
      const dupeVisits = await db
        .select({
          id: placeVisits.id,
          userId: placeVisits.userId,
          visitedOn: placeVisits.visitedOn,
        })
        .from(placeVisits)
        .where(eq(placeVisits.placeId, dupe.id));
      for (const v of dupeVisits) {
        const conflict = await db
          .select({ id: placeVisits.id })
          .from(placeVisits)
          .where(
            and(
              eq(placeVisits.placeId, keeper.id),
              eq(placeVisits.userId, Number(v.userId)),
              eq(placeVisits.visitedOn, v.visitedOn),
            ),
          );
        if (conflict.length > 0) {
          await db.delete(placeVisits).where(eq(placeVisits.id, Number(v.id)));
          droppedDuplicateVisits += 1;
        } else {
          await db
            .update(placeVisits)
            .set({ placeId: keeper.id })
            .where(eq(placeVisits.id, Number(v.id)));
          movedVisits += 1;
        }
      }

      const dupeReports = await db
        .select({ id: placeReports.id })
        .from(placeReports)
        .where(eq(placeReports.placeId, dupe.id));
      await db
        .update(placeReports)
        .set({ placeId: keeper.id })
        .where(eq(placeReports.placeId, dupe.id));

      const dupeImages = await db
        .select({ id: placeImages.id })
        .from(placeImages)
        .where(eq(placeImages.placeId, dupe.id));
      await db
        .update(placeImages)
        .set({ placeId: keeper.id })
        .where(eq(placeImages.placeId, dupe.id));

      // Junction tables have composite PKs — re-point via upsert, then clear.
      const dupeCategories = await db
        .select({ categoryId: placeCategories.categoryId })
        .from(placeCategories)
        .where(eq(placeCategories.placeId, dupe.id));
      for (const c of dupeCategories) {
        await db
          .insert(placeCategories)
          .values({ placeId: keeper.id, categoryId: Number(c.categoryId) })
          .onDuplicateKeyUpdate({ set: { placeId: keeper.id } });
      }
      await db.delete(placeCategories).where(eq(placeCategories.placeId, dupe.id));

      const dupeAmenities = await db
        .select({ amenityId: placeAmenities.amenityId })
        .from(placeAmenities)
        .where(eq(placeAmenities.placeId, dupe.id));
      for (const a of dupeAmenities) {
        await db
          .insert(placeAmenities)
          .values({ placeId: keeper.id, amenityId: Number(a.amenityId) })
          .onDuplicateKeyUpdate({ set: { placeId: keeper.id } });
      }
      await db.delete(placeAmenities).where(eq(placeAmenities.placeId, dupe.id));

      await db.delete(places).where(eq(places.id, dupe.id));

      merged.push({
        keptId: keeper.id,
        keptSlug: keeper.slug,
        deletedId: dupe.id,
        deletedSlug: dupe.slug,
        movedVisits,
        droppedDuplicateVisits,
        movedReports: dupeReports.length,
        movedImages: dupeImages.length,
      });
    }
  }

  return { merged };
}
