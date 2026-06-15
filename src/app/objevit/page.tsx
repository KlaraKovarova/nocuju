import { and, asc, eq, gte, inArray, sql } from "drizzle-orm";

import { db } from "@/db/client";
import {
  categories,
  locations,
  placeCategories,
  placeImages,
  places,
} from "@/db/schema";

import { FilterSidebar, type FilterOption } from "./_components/FilterSidebar";
import { Pagination } from "./_components/Pagination";
import { PlaceCard, type PlaceCardData } from "./_components/PlaceCard";
import { PAGE_SIZE, parseFilters, type ParsedFilters } from "./filters";

const CATEGORY_OPTIONS: FilterOption[] = [
  { value: "utulna", label: "Útulna" },
  { value: "nouzove-nocoviste", label: "Nouzové nocoviště" },
];

const SURFACE_OPTIONS: FilterOption[] = [
  { value: "kamenna", label: "Kamenná" },
  { value: "drevena", label: "Dřevěná" },
  { value: "hlinena", label: "Hliněná" },
  { value: "trava", label: "Travnatá" },
  { value: "mix", label: "Smíšená" },
];

type SurfaceValue = (typeof places.surface.enumValues)[number];

function whereClause(filters: ParsedFilters) {
  const conditions = [] as ReturnType<typeof eq>[];

  if (filters.surfaces.length) {
    conditions.push(
      inArray(places.surface, filters.surfaces as SurfaceValue[]),
    );
  }
  if (filters.wc === "yes") conditions.push(eq(places.hasWc, true));
  if (filters.wc === "no") conditions.push(eq(places.hasWc, false));
  if (filters.sleepsMin !== null) {
    conditions.push(gte(places.sleeps, filters.sleepsMin));
  }
  if (filters.categories.length) {
    const subquery = db
      .select({ placeId: placeCategories.placeId })
      .from(placeCategories)
      .innerJoin(categories, eq(placeCategories.categoryId, categories.id))
      .where(inArray(categories.slug, filters.categories));
    conditions.push(inArray(places.id, subquery));
  }
  if (filters.region) {
    const subquery = db
      .select({ id: locations.id })
      .from(locations)
      .where(eq(locations.region, filters.region));
    conditions.push(inArray(places.locationId, subquery));
  }

  return conditions.length ? and(...conditions) : undefined;
}

async function loadRegionOptions(): Promise<FilterOption[]> {
  const rows = await db
    .selectDistinct({ region: locations.region })
    .from(locations)
    .innerJoin(places, eq(places.locationId, locations.id))
    .orderBy(asc(locations.region));
  return rows
    .map((r) => r.region)
    .filter((r): r is string => Boolean(r && r.trim()))
    .map((r) => ({ value: r, label: r }));
}

async function loadPlaces(filters: ParsedFilters): Promise<{
  cards: PlaceCardData[];
  total: number;
}> {
  const where = whereClause(filters);

  const [{ count }] = (await db
    .select({ count: sql<number>`count(*)` })
    .from(places)
    .where(where)) as Array<{ count: number }>;

  const total = Number(count);

  if (total === 0) return { cards: [], total: 0 };

  const offset = (filters.page - 1) * PAGE_SIZE;

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
    .where(where)
    .orderBy(asc(places.name))
    .limit(PAGE_SIZE)
    .offset(offset);

  const placeIds = rows.map((r) => Number(r.id));
  if (placeIds.length === 0) return { cards: [], total };

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

  const cards: PlaceCardData[] = rows.map((row) => ({
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

  return { cards, total };
}

export const metadata = {
  title: "Objevit útulny a nocoviště — NOC",
  description:
    "Procházej databázi turistických útulen, přístřešků a nouzových nocovišť v Česku. Filtruj podle kategorie, povrchu, WC a počtu míst.",
};

export default async function ObjevitPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const filters = parseFilters(await searchParams);
  const [{ cards, total }, regionOptions] = await Promise.all([
    loadPlaces(filters),
    loadRegionOptions(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900">Objevit místa</h1>
        <p className="mt-2 text-zinc-600">
          {total === 0
            ? "Žádná místa neodpovídají filtru."
            : `${total} ${pluralizeMista(total)} k přespání.`}
        </p>
      </header>

      <div className="flex flex-col gap-8 lg:flex-row">
        <FilterSidebar
          filters={filters}
          categoryOptions={CATEGORY_OPTIONS}
          surfaceOptions={SURFACE_OPTIONS}
          regionOptions={regionOptions}
        />

        <section className="flex-1">
          {cards.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white p-16 text-center">
              <p className="text-lg font-medium text-zinc-700">
                Nic jsme nenašli.
              </p>
              <p className="mt-2 max-w-sm text-sm text-zinc-500">
                Zkus uvolnit některé filtry nebo začni od nuly.
              </p>
              <a
                href="/objevit"
                className="mt-4 rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Zrušit všechny filtry
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {cards.map((card) => (
                <PlaceCard key={card.place.id} data={card} />
              ))}
            </div>
          )}

          <Pagination filters={filters} totalPages={totalPages} />
        </section>
      </div>
    </main>
  );
}

function pluralizeMista(n: number): string {
  if (n === 1) return "místo";
  if (n >= 2 && n <= 4) return "místa";
  return "míst";
}
