import { NextResponse } from "next/server";

import { applyStartupMigrations } from "@/db/apply-startup-migrations";
import { sqlClient } from "@/db/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type StatRow = { INDEX_NAME: string; COLUMN_NAME: string; SEQ_IN_INDEX: number };

// One-shot schema check used to verify the NOC-52 startup migration landed.
// Re-runs `applyStartupMigrations()` on every call so a transient boot-time
// failure can be retried with a single curl; the migration is idempotent.
export async function GET() {
  const config = {
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    ssl: process.env.DATABASE_SSL === "true",
  };

  try {
    await applyStartupMigrations();
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        stage: "applyStartupMigrations",
        config,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 503 },
    );
  }

  try {
    const [dbRows] = (await sqlClient.query(`SELECT DATABASE() AS db`)) as [
      Array<{ db: string | null }>,
      unknown,
    ];
    const database = dbRows?.[0]?.db ?? null;

    const [tableRows] = (await sqlClient.query(
      `SELECT COUNT(*) AS n FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'analytics_events'`,
      [database],
    )) as [Array<{ n: number }>, unknown];
    const tableExists = Number(tableRows?.[0]?.n ?? 0) > 0;

    const [indexRows] = (await sqlClient.query(
      `SELECT INDEX_NAME, COLUMN_NAME, SEQ_IN_INDEX
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'analytics_events'
       ORDER BY INDEX_NAME, SEQ_IN_INDEX`,
      [database],
    )) as [StatRow[], unknown];

    const indexes: Record<string, string[]> = {};
    for (const row of indexRows) {
      const list = indexes[row.INDEX_NAME] ?? [];
      list.push(row.COLUMN_NAME);
      indexes[row.INDEX_NAME] = list;
    }

    const required = [
      "analytics_events_created_idx",
      "analytics_events_path_created_idx",
      "analytics_events_session_idx",
    ];
    const missing = required.filter((name) => !indexes[name]);

    const [countRows] = (await sqlClient.query(
      `SELECT COUNT(*) AS n FROM analytics_events`,
    ).catch(() => [[{ n: null }], null])) as [Array<{ n: number | null }>, unknown];
    const rowCount = countRows?.[0]?.n ?? null;

    return NextResponse.json({
      ok: tableExists && missing.length === 0,
      database,
      config,
      analyticsEvents: {
        tableExists,
        indexes,
        missingIndexes: missing,
        rowCount,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        stage: "introspection",
        config,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 503 },
    );
  }
}
