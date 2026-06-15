import type { Metadata } from "next";
import Link from "next/link";

import { FilterSidebar } from "@/components/filter-sidebar";
import { PlacesMapLoader } from "@/components/places-map-loader";
import {
  getAllCategories,
  getPlaces,
  parseFiltersFromSearch,
  placeCoords,
} from "@/lib/places";
import { tryDb } from "@/lib/safe-db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Mapa",
  description:
    "Mapa českých útulen a nouzových nocovišť. OSM podklad, filtr podle kategorie a vybavení.",
};

type SearchParams = Record<string, string | string[] | undefined>;

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const filters = parseFiltersFromSearch(params);

  const dataResult = await tryDb(async () => {
    const [places, categories] = await Promise.all([
      getPlaces(filters, { all: true }),
      getAllCategories(),
    ]);
    return { places, categories };
  });

  if (!dataResult.ok) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          Mapu nelze načíst
        </h1>
        <p className="mt-3 text-[color:var(--muted)]">
          Databáze je dočasně nedostupná. Zkus to za chvíli.
        </p>
        <p className="mt-6">
          <Link
            href="/"
            className="font-semibold text-[color:var(--accent)] hover:text-[color:var(--accent-hover)]"
          >
            Zpět na úvod
          </Link>
        </p>
      </div>
    );
  }

  const { places, categories } = dataResult.value;
  const markers = places.items.flatMap((p) => {
    const coords = placeCoords(p);
    if (!coords) return [];
    return [
      {
        id: p.id,
        slug: p.slug,
        name: p.name,
        city: p.city,
        lat: coords.lat,
        lng: coords.lng,
        categorySlug: p.categories[0]?.slug ?? null,
      },
    ];
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--accent)]">
          Mapa
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">Mapa nocovišť</h1>
        <p className="max-w-2xl text-[color:var(--muted)]">
          Útulny a nouzová nocoviště na OpenStreetMap. Klikni na piktogram a
          otevřeš detail.
        </p>
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-[260px_1fr]">
        <FilterSidebar
          basePath="/mapa"
          filters={filters}
          categories={categories}
        />

        <div className="flex flex-col gap-4">
          <div className="overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)]">
            <div className="h-[540px] w-full">
              <PlacesMapLoader markers={markers} />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[color:var(--muted)]">
            <div className="flex items-center gap-4">
              <LegendDot color="#2f5d3a" label="Útulny" />
              <LegendDot color="#7b5a3a" label="Nouzová nocoviště" />
            </div>
            <span>
              Zobrazeno {markers.length} z {places.total} míst
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span
        aria-hidden
        className="inline-block h-3 w-3 rounded-full border border-white shadow"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}
