import { asc, eq, inArray } from "drizzle-orm";

import { db } from "@/db/client";
import {
  categories,
  locations,
  placeCategories,
  placeImages,
  places,
} from "@/db/schema";

import { type PlaceCardData } from "../objevit/_components/PlaceCard";

import { MojeMistaList } from "./MojeMistaList";

async function loadAllPlaceCards(): Promise<PlaceCardData[]> {
  const rows = await db
    .select({
      id: places.id,
      slug: places.slug,
      name: places.name,
      surface: places.surface,
      hasWc: places.hasWc,
      sleeps: places.sleeps,
      city: locations.city,
      region: locations.region,
    })
    .from(places)
    .leftJoin(locations, eq(places.locationId, locations.id))
    .orderBy(asc(places.name));

  if (rows.length === 0) return [];

  const placeIds = rows.map((r) => Number(r.id));

  const [categoryRows, imageRows] = await Promise.all([
    db
      .select({
        placeId: placeCategories.placeId,
        slug: categories.slug,
      })
      .from(placeCategories)
      .innerJoin(categories, eq(placeCategories.categoryId, categories.id))
      .where(inArray(placeCategories.placeId, placeIds)),
    db
      .select({
        placeId: placeImages.placeId,
        url: placeImages.url,
        sortOrder: placeImages.sortOrder,
      })
      .from(placeImages)
      .where(inArray(placeImages.placeId, placeIds))
      .orderBy(asc(placeImages.sortOrder)),
  ]);

  const categorySlugsByPlace = new Map<number, string[]>();
  for (const row of categoryRows) {
    const id = Number(row.placeId);
    const list = categorySlugsByPlace.get(id) ?? [];
    list.push(row.slug);
    categorySlugsByPlace.set(id, list);
  }

  const firstImageByPlace = new Map<number, string>();
  for (const row of imageRows) {
    const id = Number(row.placeId);
    if (!firstImageByPlace.has(id)) firstImageByPlace.set(id, row.url);
  }

  return rows.map((row) => ({
    place: {
      id: Number(row.id),
      slug: row.slug,
      name: row.name,
      surface: row.surface ?? null,
      hasWc: row.hasWc,
      sleeps: row.sleeps ?? null,
    },
    city: row.city ?? null,
    region: row.region ?? null,
    categorySlugs: categorySlugsByPlace.get(Number(row.id)) ?? [],
    imageUrl: firstImageByPlace.get(Number(row.id)) ?? null,
  }));
}

export const metadata = {
  title: "Moje místa — uložená nocoviště — NOC",
  description:
    "Tvoje uložená místa k přespání. Klikni na srdíčko u kteréhokoli místa a uloží se sem na tomto zařízení.",
  robots: { index: false, follow: false },
};

export default async function MojeMistaPage() {
  const allCards = await loadAllPlaceCards();
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 lg:px-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-zinc-900">Moje místa</h1>
        <p className="mt-2 text-zinc-600">
          Uložená místa k přespání. Drží se v tomto prohlížeči — pokud
          vyčistíš data nebo přejdeš na jiné zařízení, tvůj seznam tam nebude.
        </p>
      </header>
      <MojeMistaList allCards={allCards} />
    </main>
  );
}
