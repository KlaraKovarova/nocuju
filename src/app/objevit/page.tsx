import type { Metadata } from "next";
import Link from "next/link";

import { FilterSidebar } from "@/components/filter-sidebar";
import { PlaceCard } from "@/components/place-card";
import {
  filtersToQueryString,
  getAllCategories,
  getPlaces,
  parseFiltersFromSearch,
} from "@/lib/places";
import { tryDb } from "@/lib/safe-db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Objevit místa",
  description:
    "Filtruj útulny a nouzová nocoviště podle kategorie, povrchu, vybavení a kapacity.",
};

const PAGE_SIZE = 24;

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ObjevitPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const filters = parseFiltersFromSearch(params);
  const pageRaw = Array.isArray(params.page) ? params.page[0] : params.page;
  const page = Math.max(1, Number(pageRaw) || 1);

  const dataResult = await tryDb(async () => {
    const [places, categories] = await Promise.all([
      getPlaces(filters, { page, pageSize: PAGE_SIZE }),
      getAllCategories(),
    ]);
    return { places, categories };
  });

  if (!dataResult.ok) {
    return <DbErrorState basePath="/objevit" error={dataResult.error} />;
  }

  const { places, categories } = dataResult.value;
  const totalPages = Math.max(1, Math.ceil(places.total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--accent)]">
          Katalog
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">Objevit místa</h1>
        <p className="max-w-2xl text-[color:var(--muted)]">
          {places.total > 0
            ? `${places.total} míst v katalogu. Použij filtr a najdi to svoje.`
            : "Filtru zatím nic neodpovídá. Zkus výběr trochu uvolnit."}
        </p>
      </div>

      <div className="mt-10 grid gap-10 md:grid-cols-[260px_1fr]">
        <FilterSidebar
          basePath="/objevit"
          filters={filters}
          categories={categories}
        />

        <div>
          {places.items.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {places.items.map((place) => (
                  <li key={place.id}>
                    <PlaceCard place={place} />
                  </li>
                ))}
              </ul>
              {totalPages > 1 ? (
                <Pagination
                  basePath="/objevit"
                  filters={filters}
                  page={page}
                  totalPages={totalPages}
                />
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-[color:var(--surface)] p-10 text-center">
      <h2 className="text-lg font-semibold">Žádné výsledky</h2>
      <p className="mt-2 text-sm text-[color:var(--muted)]">
        Zvolené filtry zatím nic nenašly. Zkus odstranit některé filtry nebo se
        podívej na{" "}
        <Link
          href="/mapa"
          className="font-semibold text-[color:var(--accent)] hover:text-[color:var(--accent-hover)]"
        >
          mapu
        </Link>
        .
      </p>
    </div>
  );
}

function Pagination({
  basePath,
  filters,
  page,
  totalPages,
}: {
  basePath: string;
  filters: ReturnType<typeof parseFiltersFromSearch>;
  page: number;
  totalPages: number;
}) {
  const buildHref = (p: number) => {
    const qs = filtersToQueryString(filters);
    const sep = qs ? "&" : "?";
    return p === 1 ? `${basePath}${qs}` : `${basePath}${qs}${sep}page=${p}`;
  };

  return (
    <nav
      aria-label="Stránkování"
      className="mt-10 flex items-center justify-between text-sm"
    >
      <a
        href={page > 1 ? buildHref(page - 1) : undefined}
        aria-disabled={page === 1}
        className={
          page === 1
            ? "pointer-events-none text-[color:var(--muted)]"
            : "font-semibold text-[color:var(--accent)] hover:text-[color:var(--accent-hover)]"
        }
      >
        ← Předchozí
      </a>
      <span className="text-[color:var(--muted)]">
        Strana {page} z {totalPages}
      </span>
      <a
        href={page < totalPages ? buildHref(page + 1) : undefined}
        aria-disabled={page === totalPages}
        className={
          page === totalPages
            ? "pointer-events-none text-[color:var(--muted)]"
            : "font-semibold text-[color:var(--accent)] hover:text-[color:var(--accent-hover)]"
        }
      >
        Další →
      </a>
    </nav>
  );
}

function DbErrorState({ basePath, error }: { basePath: string; error: string }) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-3xl font-semibold tracking-tight">
        Databáze je dočasně nedostupná
      </h1>
      <p className="mt-3 text-[color:var(--muted)]">
        Katalog míst se právě nepodařilo načíst. Zkus to za chvíli — pokud
        problém přetrvá, dej nám vědět na{" "}
        <a
          href="mailto:ahoj@nocuju.cz"
          className="text-[color:var(--accent)] hover:text-[color:var(--accent-hover)]"
        >
          ahoj@nocuju.cz
        </a>
        .
      </p>
      {process.env.NODE_ENV !== "production" ? (
        <pre className="mt-6 overflow-auto rounded-lg bg-[color:var(--surface)] p-4 text-xs text-[color:var(--muted)]">
          {error}
        </pre>
      ) : null}
      <p className="mt-8 text-sm text-[color:var(--muted)]">
        <Link
          href={basePath}
          className="font-semibold text-[color:var(--accent)] hover:text-[color:var(--accent-hover)]"
        >
          Zkusit znovu
        </Link>
      </p>
    </div>
  );
}
