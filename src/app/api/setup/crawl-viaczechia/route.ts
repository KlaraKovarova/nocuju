import { NextRequest, NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  countViaczechiaPlaces,
  runViaczechiaCrawl,
} from "@/lib/crawl-viaczechia";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Crawler fetches viaczechia.cz + does ~35 upsert round-trips; default Vercel
// timeout is too tight. Hostinger ignores this hint but harmless.
export const maxDuration = 60;

// One-time setup window: when no viaczechia rows exist yet, anyone can POST
// to seed them. Once any row exists, require an admin session or a matching
// SETUP_TOKEN bearer. Mirrors /api/setup/bootstrap auth shape.
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
    const existingCount = await countViaczechiaPlaces();
    if (existingCount > 0 && !(await isAuthorized(req))) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "viaczechia rows already present; admin session or SETUP_TOKEN bearer required to re-run",
          existingCount,
        },
        { status: 401 },
      );
    }
    const summary = await runViaczechiaCrawl();
    return NextResponse.json(
      { ok: true, firstRun: existingCount === 0, ...summary },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const existingCount = await countViaczechiaPlaces();
    return NextResponse.json({ ok: true, existingCount });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
