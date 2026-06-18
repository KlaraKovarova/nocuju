import { asc } from "drizzle-orm";
import type { MetadataRoute } from "next";

import { db } from "@/db/client";
import { places } from "@/db/schema";
import { loadRegionRows } from "@/lib/regions";
import { getSiteUrl } from "@/lib/site-url";

export const revalidate = 86400;

const STATIC_PATHS: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/objevit", changeFrequency: "daily", priority: 0.9 },
  { path: "/mapa", changeFrequency: "weekly", priority: 0.8 },
  { path: "/o-projektu", changeFrequency: "yearly", priority: 0.4 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();
  const now = new Date();

  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map((entry) => ({
    url: `${baseUrl}${entry.path}`,
    lastModified: now,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));

  let regionRows: Awaited<ReturnType<typeof loadRegionRows>> = [];
  let placeRows: Array<{ slug: string; updatedAt: Date | null }> = [];
  try {
    [regionRows, placeRows] = await Promise.all([
      loadRegionRows(),
      db
        .select({
          slug: places.slug,
          updatedAt: places.updatedAt,
        })
        .from(places)
        .orderBy(asc(places.slug)),
    ]);
  } catch {
    // DB unavailable at build/ISR time — fall back to static-only sitemap.
  }

  for (const region of regionRows) {
    entries.push({
      url: `${baseUrl}/oblast/${region.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  for (const place of placeRows) {
    entries.push({
      url: `${baseUrl}/misto/${place.slug}`,
      lastModified: place.updatedAt ?? now,
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }

  return entries;
}
