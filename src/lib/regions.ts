import { asc, eq, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { locations, places } from "@/db/schema";

const DIACRITIC_MAP: Record<string, string> = {
  á: "a", č: "c", ď: "d", é: "e", ě: "e", í: "i", ň: "n", ó: "o",
  ř: "r", š: "s", ť: "t", ú: "u", ů: "u", ý: "y", ž: "z",
};

function stripDiacritics(input: string): string {
  let out = "";
  for (const ch of input.toLowerCase()) {
    out += DIACRITIC_MAP[ch] ?? ch;
  }
  return out;
}

export function slugifyRegion(name: string): string {
  const cleaned = name
    .replace(/\bkraj\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return stripDiacritics(cleaned)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type RegionRow = {
  name: string;
  slug: string;
  count: number;
};

export async function loadRegionRows(): Promise<RegionRow[]> {
  const rows = (await db
    .select({
      region: locations.region,
      count: sql<number>`count(*)`,
    })
    .from(places)
    .innerJoin(locations, eq(places.locationId, locations.id))
    .groupBy(locations.region)
    .orderBy(asc(locations.region))) as Array<{
    region: string | null;
    count: number;
  }>;

  return rows
    .filter((r): r is { region: string; count: number } =>
      Boolean(r.region && r.region.trim()),
    )
    .map((r) => ({
      name: r.region,
      slug: slugifyRegion(r.region),
      count: Number(r.count),
    }));
}
