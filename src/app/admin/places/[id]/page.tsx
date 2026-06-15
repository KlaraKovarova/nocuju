import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { db } from "@/db/client";
import {
  amenities,
  categories,
  locations,
  placeAmenities,
  placeCategories,
  placeImages,
  places,
} from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";

import { AdminShell } from "../../_components/AdminShell";
import {
  PlaceForm,
  type PlaceFormInitial,
  type PlaceFormOption,
} from "../_components/PlaceForm";

export const dynamic = "force-dynamic";

async function loadInitial(placeId: number): Promise<PlaceFormInitial | null> {
  const placeRows = await db
    .select()
    .from(places)
    .where(eq(places.id, placeId))
    .limit(1);
  const place = placeRows[0];
  if (!place) return null;

  const [locationRows, categoryRows, amenityRows, imageRows] = await Promise.all([
    place.locationId
      ? db
          .select()
          .from(locations)
          .where(eq(locations.id, Number(place.locationId)))
          .limit(1)
      : Promise.resolve([] as (typeof locations.$inferSelect)[]),
    db
      .select({ slug: categories.slug })
      .from(placeCategories)
      .innerJoin(categories, eq(placeCategories.categoryId, categories.id))
      .where(eq(placeCategories.placeId, placeId)),
    db
      .select({ slug: amenities.slug })
      .from(placeAmenities)
      .innerJoin(amenities, eq(placeAmenities.amenityId, amenities.id))
      .where(eq(placeAmenities.placeId, placeId)),
    db
      .select()
      .from(placeImages)
      .where(eq(placeImages.placeId, placeId))
      .orderBy(asc(placeImages.sortOrder)),
  ]);

  const location = locationRows[0];

  const imagesText = imageRows
    .map((img) => (img.alt ? `${img.url} | ${img.alt}` : img.url))
    .join("\n");

  return {
    id: placeId,
    name: place.name,
    slug: place.slug,
    description: place.description ?? "",
    city: location?.city ?? "",
    region: location?.region ?? "",
    lat: place.lat,
    lng: place.lng,
    elevationM: place.elevationM != null ? String(place.elevationM) : "",
    sleeps: place.sleeps != null ? String(place.sleeps) : "",
    surface: place.surface ?? "",
    hasWc: Boolean(place.hasWc),
    isFree: Boolean(place.isFree),
    source: place.source,
    sourceUrl: place.sourceUrl ?? "",
    categorySlugs: categoryRows.map((r) => r.slug),
    amenitySlugs: amenityRows.map((r) => r.slug),
    imagesText,
  };
}

async function loadTaxonomy(): Promise<{
  categoryOptions: PlaceFormOption[];
  amenityOptions: PlaceFormOption[];
}> {
  const [categoryRows, amenityRows] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.name)),
    db.select().from(amenities).orderBy(asc(amenities.label)),
  ]);
  return {
    categoryOptions: categoryRows.map((r) => ({ slug: r.slug, label: r.name })),
    amenityOptions: amenityRows.map((r) => ({ slug: r.slug, label: r.label })),
  };
}

export default async function EditPlacePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const placeId = parseInt(id, 10);
  if (!Number.isFinite(placeId) || placeId <= 0) notFound();

  const initial = await loadInitial(placeId);
  if (!initial) notFound();

  const { categoryOptions, amenityOptions } = await loadTaxonomy();

  const sp = await searchParams;
  const errorRaw = Array.isArray(sp.error) ? sp.error[0] : sp.error;
  const errorMessage = errorRaw ? decodeURIComponent(errorRaw) : null;
  const savedRaw = Array.isArray(sp.saved) ? sp.saved[0] : sp.saved;
  const successMessage = savedRaw === "1" ? "Změny uloženy." : null;

  return (
    <AdminShell title={`Upravit: ${initial.name}`}>
      <PlaceForm
        initial={initial}
        categoryOptions={categoryOptions}
        amenityOptions={amenityOptions}
        submitUrl={`/api/admin/places/${placeId}`}
        deleteUrl={`/api/admin/places/${placeId}/delete`}
        errorMessage={errorMessage}
        successMessage={successMessage}
      />
    </AdminShell>
  );
}
