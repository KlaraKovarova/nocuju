import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import {
  amenities,
  categories,
  locations,
  placeAmenities,
  placeCategories,
  placeImages,
  places,
  sourceEnum,
  surfaceEnum,
} from "@/db/schema";

type SurfaceLiteral = (typeof surfaceEnum)[number];
type SourceLiteral = (typeof sourceEnum)[number];

type ImageEntry = { url: string; alt: string | null };

export type ParsedForm = {
  name: string;
  slug: string;
  description: string | null;
  city: string | null;
  region: string | null;
  lat: string;
  lng: string;
  elevationM: number | null;
  sleeps: number | null;
  surface: SurfaceLiteral | null;
  hasWc: boolean;
  isFree: boolean;
  source: SourceLiteral;
  sourceUrl: string;
  categorySlugs: string[];
  amenitySlugs: string[];
  images: ImageEntry[];
};

export class FormError extends Error {}

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
}

function readString(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function readOptionalString(fd: FormData, key: string): string | null {
  const v = readString(fd, key);
  return v ? v : null;
}

function readNumber(fd: FormData, key: string): number | null {
  const v = readString(fd, key);
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function readBool(fd: FormData, key: string): boolean {
  return fd.get(key) === "on" || fd.get(key) === "true";
}

function readAll(fd: FormData, key: string): string[] {
  return fd
    .getAll(key)
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter(Boolean);
}

function parseImages(raw: string): ImageEntry[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [url, ...altParts] = line.split("|");
      const alt = altParts.join("|").trim();
      return { url: url.trim(), alt: alt || null };
    })
    .filter((entry) => entry.url.length > 0);
}

export function parseForm(fd: FormData): ParsedForm {
  const name = readString(fd, "name");
  if (!name) throw new FormError("Název je povinný.");

  const slugRaw = readString(fd, "slug");
  const slug = slugRaw ? slugify(slugRaw) : slugify(name);
  if (!slug) throw new FormError("Slug nelze vygenerovat z prázdného názvu.");

  const lat = readString(fd, "lat");
  const lng = readString(fd, "lng");
  if (!lat || !lng) throw new FormError("GPS souřadnice (lat, lng) jsou povinné.");
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
    throw new FormError("GPS souřadnice musí být čísla.");
  }

  const surfaceRaw = readString(fd, "surface");
  const surface = (surfaceEnum as readonly string[]).includes(surfaceRaw)
    ? (surfaceRaw as SurfaceLiteral)
    : null;

  const sourceRaw = readString(fd, "source") || "manual";
  if (!(sourceEnum as readonly string[]).includes(sourceRaw)) {
    throw new FormError("Neplatný zdroj.");
  }

  // NOC-86: every place must have a verifiable origin URL so the public site
  // never shows fabricated entries. The `seed://` scheme was used by an old
  // dev-only seed and is rejected here.
  const sourceUrl = readOptionalString(fd, "sourceUrl");
  if (!sourceUrl) {
    throw new FormError(
      "Odkaz na zdroj (URL) je povinný – mapy.cz, oficiální stránka KČT, OSM, fotka s GPS apod.",
    );
  }
  if (sourceUrl.startsWith("seed://")) {
    throw new FormError("Schéma seed:// je vyhrazené pro dev seed a nelze ho uložit.");
  }
  if (!/^https?:\/\//i.test(sourceUrl)) {
    throw new FormError("Odkaz na zdroj musí začínat http:// nebo https://.");
  }

  return {
    name,
    slug,
    description: readOptionalString(fd, "description"),
    city: readOptionalString(fd, "city"),
    region: readOptionalString(fd, "region"),
    lat,
    lng,
    elevationM: readNumber(fd, "elevationM"),
    sleeps: readNumber(fd, "sleeps"),
    surface,
    hasWc: readBool(fd, "hasWc"),
    isFree: readBool(fd, "isFree"),
    source: sourceRaw as SourceLiteral,
    sourceUrl,
    categorySlugs: readAll(fd, "categories"),
    amenitySlugs: readAll(fd, "amenities"),
    images: parseImages(readString(fd, "images")),
  };
}

async function upsertLocationId(
  city: string | null,
  region: string | null,
): Promise<number | null> {
  if (!city) return null;
  const existing = await db
    .select({ id: locations.id })
    .from(locations)
    .where(eq(locations.city, city))
    .limit(1);
  if (existing[0]) {
    if (region) {
      await db
        .update(locations)
        .set({ region })
        .where(eq(locations.id, Number(existing[0].id)));
    }
    return Number(existing[0].id);
  }
  await db.insert(locations).values({ city, region, country: "CZ" });
  const [row] = await db
    .select({ id: locations.id })
    .from(locations)
    .where(eq(locations.city, city))
    .limit(1);
  return row ? Number(row.id) : null;
}

async function resolveCategoryIds(slugs: string[]): Promise<number[]> {
  if (slugs.length === 0) return [];
  const rows = await db.select().from(categories);
  const bySlug = new Map(rows.map((r) => [r.slug, Number(r.id)] as const));
  return slugs
    .map((s) => bySlug.get(s))
    .filter((v): v is number => typeof v === "number");
}

async function resolveAmenityIds(slugs: string[]): Promise<number[]> {
  if (slugs.length === 0) return [];
  const rows = await db.select().from(amenities);
  const bySlug = new Map(rows.map((r) => [r.slug, Number(r.id)] as const));
  return slugs
    .map((s) => bySlug.get(s))
    .filter((v): v is number => typeof v === "number");
}

export async function assertSlugAvailable(
  slug: string,
  excludeId: number | null,
): Promise<void> {
  const rows = await db
    .select({ id: places.id })
    .from(places)
    .where(eq(places.slug, slug))
    .limit(1);
  const conflict = rows[0];
  if (conflict && Number(conflict.id) !== excludeId) {
    throw new FormError(`Slug "${slug}" už existuje. Zvol jiný.`);
  }
}

async function syncJoins(placeId: number, parsed: ParsedForm): Promise<void> {
  const categoryIds = await resolveCategoryIds(parsed.categorySlugs);
  await db.delete(placeCategories).where(eq(placeCategories.placeId, placeId));
  for (const categoryId of categoryIds) {
    await db.insert(placeCategories).values({ placeId, categoryId });
  }

  const amenityIds = await resolveAmenityIds(parsed.amenitySlugs);
  await db.delete(placeAmenities).where(eq(placeAmenities.placeId, placeId));
  for (const amenityId of amenityIds) {
    await db.insert(placeAmenities).values({ placeId, amenityId });
  }

  await db.delete(placeImages).where(eq(placeImages.placeId, placeId));
  let order = 0;
  for (const image of parsed.images) {
    await db.insert(placeImages).values({
      placeId,
      url: image.url,
      alt: image.alt,
      sortOrder: order,
    });
    order += 1;
  }
}

export async function createPlace(parsed: ParsedForm): Promise<number> {
  const locationId = await upsertLocationId(parsed.city, parsed.region);
  await db.insert(places).values({
    slug: parsed.slug,
    name: parsed.name,
    description: parsed.description,
    locationId,
    lat: parsed.lat,
    lng: parsed.lng,
    elevationM: parsed.elevationM,
    sleeps: parsed.sleeps,
    surface: parsed.surface ?? undefined,
    hasWc: parsed.hasWc,
    isFree: parsed.isFree,
    source: parsed.source,
    sourceUrl: parsed.sourceUrl,
  });
  const [row] = await db
    .select({ id: places.id })
    .from(places)
    .where(eq(places.slug, parsed.slug))
    .limit(1);
  if (!row) throw new Error("Místo se nepodařilo vytvořit.");
  const placeId = Number(row.id);
  await syncJoins(placeId, parsed);
  return placeId;
}

export async function updatePlace(
  placeId: number,
  parsed: ParsedForm,
): Promise<string | null> {
  const existing = await db
    .select({ slug: places.slug })
    .from(places)
    .where(eq(places.id, placeId))
    .limit(1);
  if (!existing[0]) {
    throw new FormError("Místo nebylo nalezeno.");
  }
  const oldSlug = existing[0].slug;
  const locationId = await upsertLocationId(parsed.city, parsed.region);
  await db
    .update(places)
    .set({
      slug: parsed.slug,
      name: parsed.name,
      description: parsed.description,
      locationId,
      lat: parsed.lat,
      lng: parsed.lng,
      elevationM: parsed.elevationM,
      sleeps: parsed.sleeps,
      surface: parsed.surface ?? null,
      hasWc: parsed.hasWc,
      isFree: parsed.isFree,
      source: parsed.source,
      sourceUrl: parsed.sourceUrl,
    })
    .where(eq(places.id, placeId));
  await syncJoins(placeId, parsed);
  return oldSlug !== parsed.slug ? oldSlug : null;
}

export async function deletePlace(placeId: number): Promise<string | null> {
  const existing = await db
    .select({ slug: places.slug })
    .from(places)
    .where(eq(places.id, placeId))
    .limit(1);
  await db.delete(placeImages).where(eq(placeImages.placeId, placeId));
  await db.delete(placeCategories).where(eq(placeCategories.placeId, placeId));
  await db.delete(placeAmenities).where(eq(placeAmenities.placeId, placeId));
  await db.delete(places).where(eq(places.id, placeId));
  return existing[0]?.slug ?? null;
}
