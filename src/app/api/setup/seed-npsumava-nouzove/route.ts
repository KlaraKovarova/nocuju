import { NextRequest, NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  countNpsumavaPlaces,
  runNpsumavaNouzoveSeed,
} from "@/lib/seed-npsumava-nouzove";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

// One-time setup window: when no npsumava rows exist yet, anyone can POST to
// seed them. Once any row exists, require an admin session or a matching
// SETUP_TOKEN bearer. Mirrors /api/setup/crawl-viaczechia auth shape.
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
    const existingCount = await countNpsumavaPlaces();
    if (existingCount > 0 && !(await isAuthorized(req))) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "npsumava rows already present; admin session or SETUP_TOKEN bearer required to re-run",
          existingCount,
        },
        { status: 401 },
      );
    }
    const summary = await runNpsumavaNouzoveSeed();
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
    const existingCount = await countNpsumavaPlaces();
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
