/**
 * Reference-data seed only.
 *
 * IMPORTANT (NOC-86): the previous version of this file also inserted ~20
 * fabricated `places` rows with `source="manual"` and `sourceUrl="seed://..."`.
 * The board found these on prod (one slug `nocoviste-stoh-rokytnice` had no
 * counterpart on mapy.com) and asked us to delete every record without a
 * verifiable origin. Place data must come from the crawlers
 * (`scripts/crawl-boudy-info.ts`, `scripts/crawl-viaczechia.ts`) or be entered
 * through the admin panel with a real `sourceUrl`. Do not re-add a PLACE_SEED
 * array here.
 */
import { eq, sql } from "drizzle-orm";

import { db } from "../db/client";
import { amenities, categories, places } from "../db/schema";

const CATEGORY_SEED = [
  { slug: "utulna", name: "Útulna" },
  { slug: "nouzove-nocoviste", name: "Nouzové nocoviště" },
] as const;

const AMENITY_SEED = [
  { slug: "wc", label: "WC" },
  { slug: "voda", label: "Pitná voda" },
  { slug: "oheniste", label: "Ohniště" },
  { slug: "stul", label: "Stůl / lavice" },
  { slug: "kamna", label: "Kamna" },
] as const;

async function upsertCategory(slug: string, name: string): Promise<void> {
  const existing = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, slug));
  if (existing[0]) return;
  await db.insert(categories).values({ slug, name });
}

async function upsertAmenity(slug: string, label: string): Promise<void> {
  const existing = await db
    .select({ id: amenities.id })
    .from(amenities)
    .where(eq(amenities.slug, slug));
  if (existing[0]) return;
  await db.insert(amenities).values({ slug, label });
}

export async function runSeed(): Promise<void> {
  for (const { slug, name } of CATEGORY_SEED) {
    await upsertCategory(slug, name);
  }
  for (const { slug, label } of AMENITY_SEED) {
    await upsertAmenity(slug, label);
  }

  const [{ count }] = (await db
    .select({ count: sql<number>`count(*)` })
    .from(places)) as Array<{ count: number }>;

  console.log(
    `seed: reference data ensured (categories + amenities); ${CATEGORY_SEED.length} categories, ${AMENITY_SEED.length} amenities`,
  );
  console.log(`places in DB after seed: ${count} (seed no longer inserts places — use crawlers or admin panel)`);
}
