/**
 * Source-of-origin audit for the `places` table.
 *
 * Why: the seed (before NOC-86) populated the table with fabricated rows
 * (source="manual", sourceUrl="seed://..."). The board flagged these as
 * trust-destroying and asked us to delete every record without a verifiable
 * origin. This module classifies rows and (when explicitly confirmed) removes
 * the fabricated ones.
 */
import { eq, like } from "drizzle-orm";

import { db } from "@/db/client";
import {
  placeAmenities,
  placeCategories,
  placeImages,
  placeReports,
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
