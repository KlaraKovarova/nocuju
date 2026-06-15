import { and, asc, eq, gte, inArray, like, or } from "drizzle-orm";

import {
  FilterSidebar,
  type FilterOption,
} from "@/app/objevit/_components/FilterSidebar";
import { parseFilters, type ParsedFilters } from "@/app/objevit/filters";
import { SearchInput } from "@/components/SearchInput";
import { db } from "@/db/client";
import {
  categories,
  locations,
  placeCategories,
  places,
} from "@/db/schema";

import { MapaView, type MapaMarker } from "./_components/MapaView";

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

const CR_CENTER: [number, number] = [49.8, 15.5];
const CR_ZOOM = 7;

type SurfaceValue = (typeof places.surface.enumValues)[number];
type CategorySlug = "utulna" | "nouzove-nocoviste";

function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => "\\" + c);
}

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
  if (filters.q) {
    const needle = `%${escapeLike(filters.q)}%`;
    const regionSubquery = db
      .select({ id: locations.id })
      .from(locations)
      .where(like(locations.region, needle));
    const qCondition = or(
      like(places.name, needle),
      like(places.description, needle),
      inArray(places.locationId, regionSubquery),
    );
    if (qCondition) conditions.push(qCondition);
  }

  return conditions.length ? and(...conditions) : undefined;
}

async function loadMarkers(filters: ParsedFilters): Promise<MapaMarker[]> {
  const where = whereClause(filters);

  const rows = await db
    .select({
      id: places.id,
      slug: places.slug,
      name: places.name,
      lat: places.lat,
      lng: places.lng,
      isFree: places.isFree,
      city: locations.city,
      region: locations.region,
    })
    .from(places)
    .leftJoin(locations, eq(places.locationId, locations.id))
    .where(where)
    .orderBy(asc(places.name));

  if (rows.length === 0) return [];

  const placeIds = rows.map((r) => Number(r.id));
  const categoryRows = await db
    .select({
      placeId: placeCategories.placeId,
      slug: categories.slug,
    })
    .from(placeCategories)
    .innerJoin(categories, eq(placeCategories.categoryId, categories.id))
    .where(inArray(placeCategories.placeId, placeIds));

  const categoriesByPlace = new Map<number, string[]>();
  for (const row of categoryRows) {
    const id = Number(row.placeId);
    const list = categoriesByPlace.get(id) ?? [];
    list.push(row.slug);
    categoriesByPlace.set(id, list);
  }

  const markers: MapaMarker[] = [];
  for (const row of rows) {
    const lat = Number(row.lat);
    const lng = Number(row.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const slugs = categoriesByPlace.get(Number(row.id)) ?? [];
    const category: CategorySlug | null = slugs.includes("utulna")
      ? "utulna"
      : slugs.includes("nouzove-nocoviste")
        ? "nouzove-nocoviste"
        : null;
    markers.push({
      id: Number(row.id),
      slug: row.slug,
      name: row.name,
      city: row.city ?? null,
      region: row.region ?? null,
      isFree: Boolean(row.isFree),
      lat,
      lng,
      category,
    });
  }
  return markers;
}

export const metadata = {
  title: "Mapa míst k přespání — NOC",
  description:
    "Interaktivní mapa turistických útulen, přístřešků a nouzových nocovišť v Česku. Filtruj podle kategorie, povrchu, WC a počtu míst.",
};

export default async function MapaPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const filters = parseFilters(await searchParams);
  const markers = await loadMarkers(filters);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 lg:px-8">
      <header className="mb-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">Mapa míst</h1>
            <p className="mt-2 text-zinc-600">
              {markers.length === 0
                ? "Žádná místa neodpovídají hledání."
                : `${markers.length} ${pluralizeMista(markers.length)} na mapě.`}
            </p>
          </div>
          <div className="lg:w-96">
            <SearchInput initialValue={filters.q ?? ""} basePath="/mapa" />
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-6 lg:flex-row">
        <FilterSidebar
          filters={filters}
          categoryOptions={CATEGORY_OPTIONS}
          surfaceOptions={SURFACE_OPTIONS}
          action="/mapa"
          resetHref="/mapa"
        />

        <section className="flex-1">
          <div className="h-[70vh] min-h-[480px] overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <MapaView center={CR_CENTER} zoom={CR_ZOOM} markers={markers} />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-zinc-600">
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-block h-3 w-3 rounded-full"
                style={{ background: "#059669" }}
              />
              Útulna
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-block h-3 w-3 rounded-full"
                style={{ background: "#d97706" }}
              />
              Nouzové nocoviště
            </span>
            <span className="ml-auto">
              <a
                href="/objevit"
                className="font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
              >
                Zobrazit jako seznam →
              </a>
            </span>
          </div>
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
