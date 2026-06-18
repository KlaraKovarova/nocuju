import { asc, eq, inArray } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/db/client";
import {
  categories,
  locations,
  placeCategories,
  placeImages,
  places,
} from "@/db/schema";
import { loadRegionRows, type RegionRow } from "@/lib/regions";

import { PlaceCard, type PlaceCardData } from "@/app/objevit/_components/PlaceCard";

export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    const rows = await loadRegionRows();
    return rows.map((r) => ({ slug: r.slug }));
  } catch {
    return [];
  }
}

async function loadRegionPlaces(regionName: string): Promise<PlaceCardData[]> {
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
    .innerJoin(locations, eq(places.locationId, locations.id))
    .where(eq(locations.region, regionName))
    .orderBy(asc(places.name));

  const placeIds = rows.map((r) => Number(r.id));
  if (placeIds.length === 0) return [];

  const [categoryRows, imageRows] = await Promise.all([
    db
      .select({ placeId: placeCategories.placeId, slug: categories.slug })
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

  const categoriesByPlace = new Map<number, string[]>();
  for (const row of categoryRows) {
    const id = Number(row.placeId);
    const list = categoriesByPlace.get(id) ?? [];
    list.push(row.slug);
    categoriesByPlace.set(id, list);
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
    categorySlugs: categoriesByPlace.get(Number(row.id)) ?? [],
    imageUrl: firstImageByPlace.get(Number(row.id)) ?? null,
  }));
}

async function findRegion(slug: string): Promise<RegionRow | null> {
  const rows = await loadRegionRows();
  return rows.find((r) => r.slug === slug) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const region = await findRegion(slug);
  if (!region) return { title: "Oblast nenalezena — NOC" };

  const description = `Útulny, sruby a nouzová nocoviště v oblasti ${region.name}. Najdi v ${region.name} ${region.count} ${pluralizeMista(region.count)} k přespání venku.`;

  return {
    title: `${region.name} — útulny a nocoviště`,
    description,
    alternates: { canonical: `/oblast/${region.slug}` },
    openGraph: {
      title: `${region.name} — útulny a nocoviště`,
      description,
      type: "website",
    },
  };
}

export default async function OblastPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const allRegions = await loadRegionRows();
  const region = allRegions.find((r) => r.slug === slug);
  if (!region) notFound();

  const cards = await loadRegionPlaces(region.name);
  const otherRegions = allRegions.filter((r) => r.slug !== region.slug);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 lg:px-8 lg:py-14">
      <nav className="text-sm text-zinc-500">
        <Link href="/objevit" className="hover:text-emerald-700 hover:underline">
          Objevit
        </Link>
        <span aria-hidden> · </span>
        <span>Oblast</span>
        <span aria-hidden> · </span>
        <span className="text-zinc-700">{region.name}</span>
      </nav>

      <header className="mt-4 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
          Oblast
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
          {region.name}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-zinc-600">
          {cards.length === 0
            ? `Zatím tu nemáme žádné záznamy z oblasti ${region.name}.`
            : `Veřejně známé útulny, sruby a nouzová nocoviště v oblasti ${region.name}. Najdeš tu ${region.count} ${pluralizeMista(region.count)} k přespání venku — vyber si podle vybavení nebo si je zobraz na mapě.`}
        </p>
        <div className="mt-5 flex flex-wrap gap-3 text-sm">
          <Link
            href={`/objevit?kraj=${encodeURIComponent(region.name)}`}
            className="rounded-full border border-zinc-300 px-4 py-2 font-medium text-zinc-700 hover:border-emerald-500 hover:text-emerald-700"
          >
            Filtrovat na seznamu →
          </Link>
          <Link
            href="/mapa"
            className="rounded-full border border-zinc-300 px-4 py-2 font-medium text-zinc-700 hover:border-emerald-500 hover:text-emerald-700"
          >
            Zobrazit na mapě
          </Link>
        </div>
      </header>

      <section className="mt-10">
        {cards.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-12 text-center text-zinc-600">
            Pro tuto oblast zatím databáze nic neukazuje. Mrkni na{" "}
            <Link
              href="/objevit"
              className="font-medium text-emerald-700 hover:underline"
            >
              celý seznam
            </Link>
            .
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => (
              <PlaceCard key={card.place.id} data={card} />
            ))}
          </div>
        )}
      </section>

      {otherRegions.length > 0 && (
        <footer className="mt-16 border-t border-zinc-200 pt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-700">
            Další oblasti
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2 text-sm">
            {otherRegions.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/oblast/${r.slug}`}
                  className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-zinc-700 hover:border-emerald-500 hover:text-emerald-700"
                >
                  {r.name}
                  <span className="ml-1 text-xs text-zinc-500">({r.count})</span>
                </Link>
              </li>
            ))}
          </ul>
        </footer>
      )}
    </main>
  );
}

function pluralizeMista(n: number): string {
  if (n === 1) return "místo";
  if (n >= 2 && n <= 4) return "místa";
  return "míst";
}
