import { NextRequest, NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import { isSchemaEmpty, runBootstrap } from "@/lib/db-bootstrap";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// One-time setup window: when the schema is empty (fresh DB), anyone can POST
// to materialize tables + seed. Once tables exist, require an admin session or
// a matching SETUP_TOKEN bearer (so the founding engineer / recovery workflow
// can re-run seed without a browser cookie).
async function isAuthorized(req: NextRequest): Promise<boolean> {
  if (await isAdminAuthenticated()) return true;
  const expected = process.env.SETUP_TOKEN;
  if (!expected) return false;
  const auth = req.headers.get("authorization") ?? "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return false;
  return m[1] === expected;
}

export async function POST(req: NextRequest) {
  try {
    const empty = await isSchemaEmpty();
    if (!empty && !(await isAuthorized(req))) {
      return NextResponse.json(
        { ok: false, error: "schema already exists; admin or SETUP_TOKEN required" },
        { status: 401 },
      );
    }
    const url = new URL(req.url);
    const seedParam = url.searchParams.get("seed");
    const seed = seedParam === null ? true : seedParam !== "false";
    const result = await runBootstrap({ seed });
    return NextResponse.json(
      {
        ok: true,
        firstRun: empty,
        ...result,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const empty = await isSchemaEmpty();
    return NextResponse.json({ ok: true, schemaEmpty: empty });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
