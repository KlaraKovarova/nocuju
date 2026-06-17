import { desc, gte, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { analyticsEvents } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";

import { AdminShell } from "../_components/AdminShell";

export const dynamic = "force-dynamic";

const WINDOW_DAYS = 7;
const TOP_ROUTE_LIMIT = 25;
const TOP_REFERRER_LIMIT = 10;

type Totals = {
  pageviews: number;
  sessions: number;
  mobile: number;
  desktop: number;
  bot: number;
  other: number;
};

type TopRoute = { path: string; pageviews: number; sessions: number };
type TopReferrer = { host: string; pageviews: number };
type DailyPoint = { day: string; pageviews: number; sessions: number };

function windowStart(): Date {
  const ms = Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return new Date(ms);
}

async function loadTotals(since: Date): Promise<Totals> {
  const rows = (await db
    .select({
      pageviews: sql<number>`count(*)`,
      sessions: sql<number>`count(distinct ${analyticsEvents.sessionId})`,
      mobile: sql<number>`sum(case when ${analyticsEvents.uaClass} = 'mobile' then 1 else 0 end)`,
      desktop: sql<number>`sum(case when ${analyticsEvents.uaClass} = 'desktop' then 1 else 0 end)`,
      bot: sql<number>`sum(case when ${analyticsEvents.uaClass} = 'bot' then 1 else 0 end)`,
      other: sql<number>`sum(case when ${analyticsEvents.uaClass} = 'other' then 1 else 0 end)`,
    })
    .from(analyticsEvents)
    .where(gte(analyticsEvents.createdAt, since))) as Array<{
    pageviews: number | string | null;
    sessions: number | string | null;
    mobile: number | string | null;
    desktop: number | string | null;
    bot: number | string | null;
    other: number | string | null;
  }>;

  const r = rows[0] ?? {};
  return {
    pageviews: Number(r.pageviews ?? 0),
    sessions: Number(r.sessions ?? 0),
    mobile: Number(r.mobile ?? 0),
    desktop: Number(r.desktop ?? 0),
    bot: Number(r.bot ?? 0),
    other: Number(r.other ?? 0),
  };
}

async function loadTopRoutes(since: Date): Promise<TopRoute[]> {
  const rows = (await db
    .select({
      path: analyticsEvents.path,
      pageviews: sql<number>`count(*)`,
      sessions: sql<number>`count(distinct ${analyticsEvents.sessionId})`,
    })
    .from(analyticsEvents)
    .where(gte(analyticsEvents.createdAt, since))
    .groupBy(analyticsEvents.path)
    .orderBy(desc(sql`count(*)`))
    .limit(TOP_ROUTE_LIMIT)) as Array<{
    path: string;
    pageviews: number | string;
    sessions: number | string;
  }>;

  return rows.map((row) => ({
    path: row.path,
    pageviews: Number(row.pageviews),
    sessions: Number(row.sessions),
  }));
}

async function loadTopReferrers(since: Date): Promise<TopReferrer[]> {
  const rows = (await db
    .select({
      host: analyticsEvents.referrerHost,
      pageviews: sql<number>`count(*)`,
    })
    .from(analyticsEvents)
    .where(
      sql`${analyticsEvents.createdAt} >= ${since} and ${analyticsEvents.referrerHost} is not null`,
    )
    .groupBy(analyticsEvents.referrerHost)
    .orderBy(desc(sql`count(*)`))
    .limit(TOP_REFERRER_LIMIT)) as Array<{
    host: string | null;
    pageviews: number | string;
  }>;

  return rows
    .filter((row): row is { host: string; pageviews: number | string } => Boolean(row.host))
    .map((row) => ({ host: row.host, pageviews: Number(row.pageviews) }));
}

async function loadDailySeries(since: Date): Promise<DailyPoint[]> {
  const rows = (await db
    .select({
      day: sql<string>`date(${analyticsEvents.createdAt})`,
      pageviews: sql<number>`count(*)`,
      sessions: sql<number>`count(distinct ${analyticsEvents.sessionId})`,
    })
    .from(analyticsEvents)
    .where(gte(analyticsEvents.createdAt, since))
    .groupBy(sql`date(${analyticsEvents.createdAt})`)
    .orderBy(sql`date(${analyticsEvents.createdAt})`)) as Array<{
    day: string | Date;
    pageviews: number | string;
    sessions: number | string;
  }>;

  return rows.map((row) => ({
    day: typeof row.day === "string" ? row.day : row.day.toISOString().slice(0, 10),
    pageviews: Number(row.pageviews),
    sessions: Number(row.sessions),
  }));
}

function formatDay(day: string): string {
  try {
    const [y, m, d] = day.split("-").map(Number);
    if (!y || !m || !d) return day;
    return new Intl.DateTimeFormat("cs-CZ", {
      day: "2-digit",
      month: "2-digit",
    }).format(new Date(y, m - 1, d));
  } catch {
    return day;
  }
}

export default async function AdminAnalyticsPage() {
  await requireAdmin();

  const since = windowStart();
  const [totals, topRoutes, topReferrers, daily] = await Promise.all([
    loadTotals(since),
    loadTopRoutes(since),
    loadTopReferrers(since),
    loadDailySeries(since),
  ]);

  const humanPageviews = totals.pageviews - totals.bot;
  const humanShare =
    totals.pageviews > 0
      ? Math.round(((totals.pageviews - totals.bot) / totals.pageviews) * 100)
      : 0;

  return (
    <AdminShell title="Analytika">
      <p className="mb-4 text-sm text-zinc-600">
        Posledních {WINDOW_DAYS} dní. Měříme jen na serveru, bez cookies třetích
        stran. Session = 30minutové okno per anonymní cookie.
      </p>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Zobrazení" value={totals.pageviews} />
        <StatCard label="Sessions" value={totals.sessions} />
        <StatCard
          label="Lidé (bez botů)"
          value={humanPageviews}
          hint={`${humanShare}% z celku`}
        />
        <StatCard label="Mobile / Desktop" value={`${totals.mobile} / ${totals.desktop}`} />
      </div>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-600">
          Denně
        </h2>
        <div className="overflow-hidden rounded border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-zinc-100 text-left text-xs uppercase tracking-wide text-zinc-600">
              <tr>
                <th className="px-3 py-2">Den</th>
                <th className="px-3 py-2 text-right">Zobrazení</th>
                <th className="px-3 py-2 text-right">Sessions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {daily.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-center text-zinc-500" colSpan={3}>
                    Zatím žádná data.
                  </td>
                </tr>
              ) : (
                daily.map((row) => (
                  <tr key={row.day}>
                    <td className="px-3 py-2 text-zinc-700">{formatDay(row.day)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-zinc-700">
                      {row.pageviews}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-zinc-700">
                      {row.sessions}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-600">
          Top stránky
        </h2>
        <div className="overflow-hidden rounded border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-zinc-100 text-left text-xs uppercase tracking-wide text-zinc-600">
              <tr>
                <th className="px-3 py-2">Cesta</th>
                <th className="px-3 py-2 text-right">Zobrazení</th>
                <th className="px-3 py-2 text-right">Sessions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {topRoutes.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-center text-zinc-500" colSpan={3}>
                    Zatím žádná data.
                  </td>
                </tr>
              ) : (
                topRoutes.map((row) => (
                  <tr key={row.path}>
                    <td className="px-3 py-2 font-mono text-xs text-zinc-700">
                      {row.path}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-zinc-700">
                      {row.pageviews}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-zinc-700">
                      {row.sessions}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-600">
          Odkud chodí (referrer host)
        </h2>
        <div className="overflow-hidden rounded border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-zinc-100 text-left text-xs uppercase tracking-wide text-zinc-600">
              <tr>
                <th className="px-3 py-2">Host</th>
                <th className="px-3 py-2 text-right">Zobrazení</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {topReferrers.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-center text-zinc-500" colSpan={2}>
                    Zatím žádné externí návštěvy.
                  </td>
                </tr>
              ) : (
                topReferrers.map((row) => (
                  <tr key={row.host}>
                    <td className="px-3 py-2 text-zinc-700">{row.host}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-zinc-700">
                      {row.pageviews}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="rounded border border-zinc-200 bg-white px-3 py-3">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900">
        {value}
      </div>
      {hint ? <div className="mt-0.5 text-xs text-zinc-500">{hint}</div> : null}
    </div>
  );
}
