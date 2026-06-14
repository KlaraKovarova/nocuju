import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const result = await db.execute(sql`select 1 as ok`);
    const ok = Array.isArray(result) ? result[0]?.ok === 1 : false;
    return NextResponse.json({
      ok: true,
      db: ok ? "reachable" : "unreachable",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        db: "unreachable",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 503 },
    );
  }
}
