import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EXPECTED_TABLES = [
  "locations",
  "categories",
  "amenities",
  "places",
  "place_categories",
  "place_amenities",
  "place_images",
] as const;

type TableReport = {
  name: string;
  exists: boolean;
  rowCount: number | null;
  error?: string;
};

async function inspectTable(name: string): Promise<TableReport> {
  try {
    const existsResult = (await db.execute(
      sql`select count(*) as n from information_schema.tables where table_schema = database() and table_name = ${name}`,
    )) as unknown as [Array<{ n: number | string }>, unknown];
    const exists = Number(existsResult[0]?.[0]?.n ?? 0) > 0;
    if (!exists) {
      return { name, exists: false, rowCount: null };
    }
    const countResult = (await db.execute(
      sql.raw(`select count(*) as n from \`${name}\``),
    )) as unknown as [Array<{ n: number | string }>, unknown];
    return {
      name,
      exists: true,
      rowCount: Number(countResult[0]?.[0]?.n ?? 0),
    };
  } catch (error) {
    return {
      name,
      exists: false,
      rowCount: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function GET() {
  try {
    const tables = await Promise.all(EXPECTED_TABLES.map(inspectTable));
    const missing = tables.filter((t) => !t.exists).map((t) => t.name);
    const ok = missing.length === 0;
    return NextResponse.json(
      {
        ok,
        missing,
        tables,
      },
      { status: ok ? 200 : 503 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 503 },
    );
  }
}
