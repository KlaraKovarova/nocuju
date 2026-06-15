import { and, eq, gte, inArray, sql } from "drizzle-orm";

import { db } from "@/db/client";
import {
  amenities,
  categories,
  locations,
  placeAmenities,
  placeCategories,
  placeImages,
  places,
  surfaceEnum,
} from "@/db/schema";
import type { Amenity, Category, Place, PlaceImage } from "@/db/schema";

export type SurfaceLiteral = (typeof surfaceEnum)[number];

export const SURFACE_LABEL: Record<SurfaceLiteral, string> = {
  kamenna: "kamenná",
  drevena: "dřevěná",
  hlinena: "hliněná",
  trava: "tráva",
  mix: "kombinovaná",
};

export type PlaceListFilters = {
  categorySlugs?: string[];
  surfaces?: SurfaceLiteral[];
  hasWc?: boolean | null;
  sleepsMin?: number | null;
};

export type PlaceSummary = Pick<
  Place,
  | "id"
  | "slug"
  | "name"
  | "description"
  | "lat"
  | "lng"
  | "sleeps"
  | "elevationM"
  | "surface"
  | "hasWc"
  | "isFree"
  | "source"
  | "sourceUrl"
> & {
  city: string | null;
  region: string | null;
  categories: Category[];
  amenities: Amenity[];
  image: PlaceImage | null;
};

export type PlaceDetail = PlaceSummary;

const SURFACE_VALUES = surfaceEnum as readonly SurfaceLiteral[];

function isSurface(value: string): value is SurfaceLiteral {
  return (SURFACE_VALUES as readonly string[]).includes(value);
}

function asNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function parseFiltersFromSearch(
  params: Record<string, string | string[] | undefined>,
): PlaceListFilters {
  const get = (key: string): string[] => {
    const v = params[key];
    if (v === undefined) return [];
    if (Array.isArray(v)) return v.flatMap((x) => x.split(",")).filter(Boolean);
    return v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const surfaces = get("povrch").filter(isSurface);
  const wcRaw = (() => {
    const v = params.wc;
    return Array.isArray(v) ? v[0] : v;
  })();
  const sleepsRaw = (() => {
    const v = params.sleepsMin;
    return Array.isArray(v) ? v[0] : v;
  })();
  const sleepsMin = sleepsRaw ? Number(sleepsRaw) : null;

  return {
    categorySlugs: get("kategorie"),
    surfaces,
    hasWc: wcRaw === "1" ? true : wcRaw === "0" ? false : null,
    sleepsMin: Number.isFinite(sleepsMin) && (sleepsMin ?? 0) > 0 ? sleepsMin : null,
  };
}

export function filtersToQueryString(filters: PlaceListFilters): string {
  const params = new URLSearchParams();
  if (filters.categorySlugs && filters.categorySlugs.length) {
    params.set("kategorie", filters.categorySlugs.join(","));
  }
  if (filters.surfaces && filters.surfaces.length) {
    params.set("povrch", filters.surfaces.join(","));
  }
  if (filters.hasWc === true) params.set("wc", "1");
  if (filters.hasWc === false) params.set("wc", "0");
  if (filters.sleepsMin && filters.sleepsMin > 0) {
    params.set("sleepsMin", String(filters.sleepsMin));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

async function loadCategoriesByPlaceIds(
  placeIds: number[],
): Promise<Map<number, Category[]>> {
  const out = new Map<number, Category[]>();
  if (!placeIds.length) return out;
  const rows = await db
    .select({
      placeId: placeCategories.placeId,
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
    })
    .from(placeCategories)
    .innerJoin(categories, eq(categories.id, placeCategories.categoryId))
    .where(inArray(placeCategories.placeId, placeIds));
  for (const row of rows) {
    const list = out.get(row.placeId) ?? [];
    list.push({ id: row.id, slug: row.slug, name: row.name });
    out.set(row.placeId, list);
  }
  return out;
}

async function loadAmenitiesByPlaceIds(
  placeIds: number[],
): Promise<Map<number, Amenity[]>> {
  const out = new Map<number, Amenity[]>();
  if (!placeIds.length) return out;
  const rows = await db
    .select({
      placeId: placeAmenities.placeId,
      id: amenities.id,
      slug: amenities.slug,
      label: amenities.label,
    })
    .from(placeAmenities)
    .innerJoin(amenities, eq(amenities.id, placeAmenities.amenityId))
    .where(inArray(placeAmenities.placeId, placeIds));
  for (const row of rows) {
    const list = out.get(row.placeId) ?? [];
    list.push({ id: row.id, slug: row.slug, label: row.label });
    out.set(row.placeId, list);
  }
  return out;
}

async function loadFirstImageByPlaceIds(
  placeIds: number[],
): Promise<Map<number, PlaceImage>> {
  const out = new Map<number, PlaceImage>();
  if (!placeIds.length) return out;
  const rows = await db
    .select()
    .from(placeImages)
    .where(inArray(placeImages.placeId, placeIds))
    .orderBy(placeImages.sortOrder);
  for (const row of rows) {
    if (!out.has(row.placeId)) out.set(row.placeId, row);
  }
  return out;
}

async function loadLocationMap(
  locationIds: number[],
): Promise<Map<number, { city: string; region: string | null }>> {
  const out = new Map<number, { city: string; region: string | null }>();
  if (!locationIds.length) return out;
  const rows = await db
    .select({
      id: locations.id,
      city: locations.city,
      region: locations.region,
    })
    .from(locations)
    .where(inArray(locations.id, locationIds));
  for (const row of rows) {
    out.set(Number(row.id), { city: row.city, region: row.region });
  }
  return out;
}

async function placeIdsMatchingCategories(
  slugs: string[],
): Promise<number[] | null> {
  if (!slugs.length) return null;
  const rows = await db
    .select({ placeId: placeCategories.placeId })
    .from(placeCategories)
    .innerJoin(categories, eq(categories.id, placeCategories.categoryId))
    .where(inArray(categories.slug, slugs));
  return Array.from(new Set(rows.map((r) => r.placeId)));
}

export type PlacesQueryResult = {
  items: PlaceSummary[];
  total: number;
  pageSize: number;
  page: number;
};

export async function getPlaces(
  filters: PlaceListFilters,
  options: { page?: number; pageSize?: number; all?: boolean } = {},
): Promise<PlacesQueryResult> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = options.all ? 1000 : options.pageSize ?? 24;

  const conditions = [];
  if (filters.surfaces?.length) {
    conditions.push(inArray(places.surface, filters.surfaces));
  }
  if (filters.hasWc === true) conditions.push(eq(places.hasWc, true));
  if (filters.hasWc === false) conditions.push(eq(places.hasWc, false));
  if (filters.sleepsMin && filters.sleepsMin > 0) {
    conditions.push(gte(places.sleeps, filters.sleepsMin));
  }

  if (filters.categorySlugs?.length) {
    const ids = await placeIdsMatchingCategories(filters.categorySlugs);
    if (!ids || !ids.length) {
      return { items: [], total: 0, pageSize, page };
    }
    conditions.push(inArray(places.id, ids));
  }

  const whereExpr = conditions.length ? and(...conditions) : undefined;

  const totalRow = await db
    .select({ count: sql<number>`count(*)` })
    .from(places)
    .where(whereExpr);
  const total = Number(totalRow[0]?.count ?? 0);

  const rows = await db
    .select()
    .from(places)
    .where(whereExpr)
    .orderBy(places.name)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const placeIds = rows.map((r) => Number(r.id));
  const locationIds = Array.from(
    new Set(
      rows
        .map((r) => (r.locationId === null ? null : Number(r.locationId)))
        .filter((v): v is number => v !== null),
    ),
  );

  const [catMap, amenityMap, imageMap, locMap] = await Promise.all([
    loadCategoriesByPlaceIds(placeIds),
    loadAmenitiesByPlaceIds(placeIds),
    loadFirstImageByPlaceIds(placeIds),
    loadLocationMap(locationIds),
  ]);

  const items: PlaceSummary[] = rows.map((row) => {
    const id = Number(row.id);
    const loc = row.locationId === null ? null : locMap.get(Number(row.locationId));
    return {
      id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      lat: row.lat,
      lng: row.lng,
      sleeps: row.sleeps,
      elevationM: row.elevationM,
      surface: row.surface,
      hasWc: row.hasWc,
      isFree: row.isFree,
      source: row.source,
      sourceUrl: row.sourceUrl,
      city: loc?.city ?? null,
      region: loc?.region ?? null,
      categories: catMap.get(id) ?? [],
      amenities: amenityMap.get(id) ?? [],
      image: imageMap.get(id) ?? null,
    };
  });

  return { items, total, pageSize, page };
}

export async function getPlaceBySlug(slug: string): Promise<PlaceDetail | null> {
  const rows = await db.select().from(places).where(eq(places.slug, slug)).limit(1);
  const row = rows[0];
  if (!row) return null;
  const id = Number(row.id);
  const [catMap, amenityMap, imageMap, locMap] = await Promise.all([
    loadCategoriesByPlaceIds([id]),
    loadAmenitiesByPlaceIds([id]),
    loadFirstImageByPlaceIds([id]),
    row.locationId === null
      ? Promise.resolve(new Map())
      : loadLocationMap([Number(row.locationId)]),
  ]);
  const loc = row.locationId === null ? null : locMap.get(Number(row.locationId));
  return {
    id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    lat: row.lat,
    lng: row.lng,
    sleeps: row.sleeps,
    elevationM: row.elevationM,
    surface: row.surface,
    hasWc: row.hasWc,
    isFree: row.isFree,
    source: row.source,
    sourceUrl: row.sourceUrl,
    city: loc?.city ?? null,
    region: loc?.region ?? null,
    categories: catMap.get(id) ?? [],
    amenities: amenityMap.get(id) ?? [],
    image: imageMap.get(id) ?? null,
  };
}

export async function getAllCategories(): Promise<Category[]> {
  return db.select().from(categories).orderBy(categories.name);
}

export async function getPlaceStats(): Promise<{
  total: number;
  utulna: number;
  nouzove: number;
}> {
  const totalRow = await db
    .select({ count: sql<number>`count(*)` })
    .from(places);
  const utulnaRow = await db
    .select({ count: sql<number>`count(distinct ${places.id})` })
    .from(places)
    .innerJoin(placeCategories, eq(placeCategories.placeId, places.id))
    .innerJoin(categories, eq(categories.id, placeCategories.categoryId))
    .where(eq(categories.slug, "utulna"));
  const nouzoveRow = await db
    .select({ count: sql<number>`count(distinct ${places.id})` })
    .from(places)
    .innerJoin(placeCategories, eq(placeCategories.placeId, places.id))
    .innerJoin(categories, eq(categories.id, placeCategories.categoryId))
    .where(eq(categories.slug, "nouzove-nocoviste"));
  return {
    total: Number(totalRow[0]?.count ?? 0),
    utulna: Number(utulnaRow[0]?.count ?? 0),
    nouzove: Number(nouzoveRow[0]?.count ?? 0),
  };
}

export function placeCoords(place: Pick<Place, "lat" | "lng">): {
  lat: number;
  lng: number;
} | null {
  const lat = asNumber(place.lat);
  const lng = asNumber(place.lng);
  if (lat === null || lng === null) return null;
  return { lat, lng };
}
