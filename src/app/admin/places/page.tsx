import { and, asc, eq, like, or, sql } from "drizzle-orm";
import Link from "next/link";

import { db } from "@/db/client";
import { locations, places } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";

import { AdminShell } from "../_components/AdminShell";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type PlaceRow = {
  id: number;
  slug: string;
  name: string;
  source: string;
  hasWc: boolean;
  sleeps: number | null;
  city: string | null;
  region: string | null;
  updatedAt: Date;
};

async function loadPlaces(q: string, page: number): Promise<{
  rows: PlaceRow[];
  total: number;
}> {
  const filter = q.trim();
  const where = filter
    ? or(
        like(places.name, `%${filter}%`),
        like(places.slug, `%${filter}%`),
        like(locations.city, `%${filter}%`),
      )
    : undefined;

  const baseCount = db
    .select({ count: sql<number>`count(*)` })
    .from(places)
    .leftJoin(locations, eq(places.locationId, locations.id));

  const [{ count }] = (await (where ? baseCount.where(and(where)) : baseCount)) as Array<{
    count: number;
  }>;
  const total = Number(count);

  const offset = (page - 1) * PAGE_SIZE;

  const base = db
    .select({
      id: places.id,
      slug: places.slug,
      name: places.name,
      source: places.source,
      hasWc: places.hasWc,
      sleeps: places.sleeps,
      city: locations.city,
      region: locations.region,
      updatedAt: places.updatedAt,
    })
    .from(places)
    .leftJoin(locations, eq(places.locationId, locations.id));

  const query = where ? base.where(and(where)) : base;

  const rows = (await query
    .orderBy(asc(places.name))
    .limit(PAGE_SIZE)
    .offset(offset)) as Array<{
    id: number;
    slug: string;
    name: string;
    source: string;
    hasWc: boolean;
    sleeps: number | null;
    city: string | null;
    region: string | null;
    updatedAt: Date;
  }>;

  return {
    rows: rows.map((r) => ({ ...r, id: Number(r.id) })),
    total,
  };
}

export default async function AdminPlacesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const qRaw = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const q = (qRaw ?? "").trim();
  const pageRaw = Array.isArray(sp.page) ? sp.page[0] : sp.page;
  const pageParsed = pageRaw ? parseInt(pageRaw, 10) : 1;
  const page = Number.isFinite(pageParsed) && pageParsed > 0 ? pageParsed : 1;

  const { rows, total } = await loadPlaces(q, page);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AdminShell
      title="Místa"
      actions={
        <Link
          href="/admin/places/new"
          className="rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          + Nové místo
        </Link>
      }
    >
      <form
        method="get"
        className="mb-4 flex items-center gap-2"
        action="/admin/places"
      >
        <input
          name="q"
          defaultValue={q}
          placeholder="Hledat podle názvu, slugu nebo města…"
          className="w-full max-w-md rounded border border-zinc-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
        />
        <button
          type="submit"
          className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Hledat
        </button>
        {q && (
          <Link
            href="/admin/places"
            className="text-sm text-zinc-600 hover:text-zinc-900"
          >
            Zrušit
          </Link>
        )}
      </form>

      <p className="mb-3 text-sm text-zinc-600">
        {total === 0
          ? "Žádné místo neodpovídá filtru."
          : `${total} ${pluralizeMista(total)}`}
        {totalPages > 1 && ` · strana ${page} / ${totalPages}`}
      </p>

      <div className="overflow-hidden rounded border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-100 text-left text-xs uppercase tracking-wide text-zinc-600">
            <tr>
              <th className="px-3 py-2">Název</th>
              <th className="px-3 py-2">Lokalita</th>
              <th className="px-3 py-2">Míst</th>
              <th className="px-3 py-2">WC</th>
              <th className="px-3 py-2">Zdroj</th>
              <th className="px-3 py-2">Upraveno</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-8 text-center text-zinc-500" colSpan={7}>
                  Žádná místa.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const locationLabel = [row.city, row.region]
                  .filter(Boolean)
                  .join(", ");
                return (
                  <tr key={row.id} className="hover:bg-zinc-50">
                    <td className="px-3 py-2">
                      <Link
                        href={`/admin/places/${row.id}`}
                        className="font-medium text-emerald-700 hover:underline"
                      >
                        {row.name}
                      </Link>
                      <div className="text-xs text-zinc-500">{row.slug}</div>
                    </td>
                    <td className="px-3 py-2 text-zinc-700">
                      {locationLabel || "—"}
                    </td>
                    <td className="px-3 py-2 text-zinc-700">
                      {row.sleeps ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-zinc-700">
                      {row.hasWc ? "✓" : "—"}
                    </td>
                    <td className="px-3 py-2 text-zinc-700">{row.source}</td>
                    <td className="px-3 py-2 text-xs text-zinc-500">
                      {formatDate(row.updatedAt)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/admin/places/${row.id}`}
                        className="text-sm font-medium text-zinc-700 hover:text-emerald-700"
                      >
                        Upravit
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav className="mt-4 flex items-center gap-3 text-sm">
          {page > 1 ? (
            <Link
              href={buildHref(q, page - 1)}
              className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-zinc-700 hover:bg-zinc-100"
            >
              ← Předchozí
            </Link>
          ) : (
            <span className="rounded border border-zinc-200 bg-white px-3 py-1.5 text-zinc-400">
              ← Předchozí
            </span>
          )}
          <span className="text-zinc-500">
            strana {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={buildHref(q, page + 1)}
              className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-zinc-700 hover:bg-zinc-100"
            >
              Další →
            </Link>
          ) : (
            <span className="rounded border border-zinc-200 bg-white px-3 py-1.5 text-zinc-400">
              Další →
            </span>
          )}
        </nav>
      )}
    </AdminShell>
  );
}

function buildHref(q: string, page: number): string {
  const sp = new URLSearchParams();
  if (q) sp.set("q", q);
  if (page > 1) sp.set("page", String(page));
  const qs = sp.toString();
  return qs ? `/admin/places?${qs}` : "/admin/places";
}

function pluralizeMista(n: number): string {
  if (n === 1) return "místo";
  if (n >= 2 && n <= 4) return "místa";
  return "míst";
}

function formatDate(d: Date): string {
  try {
    return new Intl.DateTimeFormat("cs-CZ", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(d);
  } catch {
    return "";
  }
}
