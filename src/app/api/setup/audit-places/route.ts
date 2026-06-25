import { NextRequest, NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import { auditPlaces } from "@/lib/places-audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Auth shape mirrors /api/setup/bootstrap and /api/setup/crawl-viaczechia:
// admin session OR Bearer SETUP_TOKEN. Both POST and GET are read-only audits;
// we expose both so curl from CI and a browser admin both work.
async function isAuthorized(req: NextRequest): Promise<boolean> {
  if (await isAdminAuthenticated()) return true;
  const expected = process.env.SETUP_TOKEN;
  if (!expected) return false;
  const auth = req.headers.get("authorization") ?? "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return false;
  return m[1] === expected;
}

async function handle(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json(
      { ok: false, error: "admin session or SETUP_TOKEN bearer required" },
      { status: 401 },
    );
  }
  try {
    const audit = await auditPlaces();
    return NextResponse.json({ ok: true, ...audit }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
