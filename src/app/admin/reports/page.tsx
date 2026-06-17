import { desc, eq, sql } from "drizzle-orm";
import Link from "next/link";

import { db } from "@/db/client";
import { placeReports, places } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { REPORT_CATEGORY_LABEL, type ReportCategory } from "@/lib/reports";

import { AdminShell } from "../_components/AdminShell";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const STATUS_TABS = [
  { value: "open", label: "Otevřené" },
  { value: "all", label: "Všechny" },
  { value: "resolved", label: "Vyřešené" },
  { value: "dismissed", label: "Zamítnuté" },
] as const;

type StatusFilter = (typeof STATUS_TABS)[number]["value"];

type ReportRow = {
  id: number;
  placeId: number;
  placeName: string;
  placeSlug: string;
  category: ReportCategory;
  note: string | null;
  contactEmail: string | null;
  status: "new" | "triaged" | "resolved" | "dismissed";
  createdAt: Date;
};

const STATUS_TONE: Record<ReportRow["status"], string> = {
  new: "bg-amber-100 text-amber-800",
  triaged: "bg-sky-100 text-sky-800",
  resolved: "bg-emerald-100 text-emerald-800",
  dismissed: "bg-zinc-200 text-zinc-700",
};

const STATUS_LABEL: Record<ReportRow["status"], string> = {
  new: "Nový",
  triaged: "Řeším",
  resolved: "Vyřešeno",
  dismissed: "Zamítnuto",
};

async function loadReports(filter: StatusFilter): Promise<{
  rows: ReportRow[];
  counts: Record<StatusFilter, number>;
}> {
  const base = db
    .select({
      id: placeReports.id,
      placeId: placeReports.placeId,
      placeName: places.name,
      placeSlug: places.slug,
      category: placeReports.category,
      note: placeReports.note,
      contactEmail: placeReports.contactEmail,
      status: placeReports.status,
      createdAt: placeReports.createdAt,
    })
    .from(placeReports)
    .leftJoin(places, eq(placeReports.placeId, places.id));

  const query =
    filter === "all"
      ? base
      : filter === "open"
        ? base.where(
            sql`${placeReports.status} in ('new','triaged')`,
          )
        : base.where(eq(placeReports.status, filter));

  const rows = (await query
    .orderBy(desc(placeReports.createdAt))
    .limit(PAGE_SIZE)) as ReportRow[];

  const countRows = (await db
    .select({
      status: placeReports.status,
      count: sql<number>`count(*)`,
    })
    .from(placeReports)
    .groupBy(placeReports.status)) as Array<{
    status: ReportRow["status"];
    count: number;
  }>;
  const byStatus: Record<ReportRow["status"], number> = {
    new: 0,
    triaged: 0,
    resolved: 0,
    dismissed: 0,
  };
  for (const r of countRows) byStatus[r.status] = Number(r.count);

  const counts: Record<StatusFilter, number> = {
    open: byStatus.new + byStatus.triaged,
    all: byStatus.new + byStatus.triaged + byStatus.resolved + byStatus.dismissed,
    resolved: byStatus.resolved,
    dismissed: byStatus.dismissed,
  };

  return {
    rows: rows.map((r) => ({ ...r, id: Number(r.id), placeId: Number(r.placeId) })),
    counts,
  };
}

function formatDateTime(d: Date): string {
  try {
    return new Intl.DateTimeFormat("cs-CZ", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return "";
  }
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const rawFilter = Array.isArray(sp.status) ? sp.status[0] : sp.status;
  const filter: StatusFilter = STATUS_TABS.some((t) => t.value === rawFilter)
    ? (rawFilter as StatusFilter)
    : "open";

  const updated = sp.updated === "1";

  const { rows, counts } = await loadReports(filter);

  return (
    <AdminShell title="Hlášení">
      {updated && (
        <p className="mb-4 rounded border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Hlášení aktualizováno.
        </p>
      )}

      <nav className="mb-4 flex flex-wrap gap-2 text-sm">
        {STATUS_TABS.map((tab) => {
          const isActive = tab.value === filter;
          return (
            <Link
              key={tab.value}
              href={`/admin/reports?status=${tab.value}`}
              className={
                isActive
                  ? "rounded bg-zinc-900 px-3 py-1.5 font-medium text-white"
                  : "rounded border border-zinc-300 bg-white px-3 py-1.5 text-zinc-700 hover:bg-zinc-100"
              }
            >
              {tab.label}
              <span
                className={
                  isActive
                    ? "ml-1.5 text-xs text-zinc-300"
                    : "ml-1.5 text-xs text-zinc-500"
                }
              >
                {counts[tab.value]}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="overflow-hidden rounded border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-100 text-left text-xs uppercase tracking-wide text-zinc-600">
            <tr>
              <th className="px-3 py-2">Místo</th>
              <th className="px-3 py-2">Kategorie</th>
              <th className="px-3 py-2">Poznámka</th>
              <th className="px-3 py-2">Kontakt</th>
              <th className="px-3 py-2">Stav</th>
              <th className="px-3 py-2">Kdy</th>
              <th className="px-3 py-2 text-right">Akce</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-8 text-center text-zinc-500" colSpan={7}>
                  Žádná hlášení.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="align-top hover:bg-zinc-50">
                  <td className="px-3 py-2">
                    {row.placeSlug ? (
                      <Link
                        href={`/misto/${row.placeSlug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-emerald-700 hover:underline"
                      >
                        {row.placeName ?? row.placeSlug}
                      </Link>
                    ) : (
                      <span className="text-zinc-500">smazané místo #{row.placeId}</span>
                    )}
                    {row.placeId > 0 && (
                      <div className="mt-0.5 text-xs">
                        <Link
                          href={`/admin/places/${row.placeId}`}
                          className="text-zinc-500 hover:text-zinc-900"
                        >
                          Upravit místo →
                        </Link>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-zinc-700">
                    {REPORT_CATEGORY_LABEL[row.category] ?? row.category}
                  </td>
                  <td className="px-3 py-2 text-zinc-700">
                    {row.note ? (
                      <span className="block max-w-md whitespace-pre-wrap break-words">
                        {row.note}
                      </span>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-zinc-700">
                    {row.contactEmail ? (
                      <a
                        href={`mailto:${row.contactEmail}`}
                        className="text-emerald-700 hover:underline"
                      >
                        {row.contactEmail}
                      </a>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[row.status]}`}
                    >
                      {STATUS_LABEL[row.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-zinc-500">
                    {formatDateTime(row.createdAt)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-2">
                      {row.status !== "resolved" && (
                        <form
                          method="post"
                          action={`/api/admin/reports/${row.id}/status`}
                        >
                          <input type="hidden" name="status" value="resolved" />
                          <input type="hidden" name="filter" value={filter} />
                          <button
                            type="submit"
                            className="rounded border border-emerald-300 bg-white px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                          >
                            Vyřešit
                          </button>
                        </form>
                      )}
                      {row.status !== "dismissed" && (
                        <form
                          method="post"
                          action={`/api/admin/reports/${row.id}/status`}
                        >
                          <input type="hidden" name="status" value="dismissed" />
                          <input type="hidden" name="filter" value={filter} />
                          <button
                            type="submit"
                            className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                          >
                            Zamítnout
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-zinc-500">
        Zobrazeno posledních {PAGE_SIZE} hlášení.
      </p>
    </AdminShell>
  );
}
