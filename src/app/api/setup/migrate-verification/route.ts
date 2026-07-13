import { NextRequest, NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  runVerificationMigration,
  verificationMigrationStatus,
} from "@/lib/migrate-verification";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

// Applies drizzle/2026-07-13_verification.sql idempotently (NOC-93). Unlike
// the seed endpoints there is no unauthenticated first-run window: this
// ALTERs existing prod tables, so it always requires an admin session or a
// SETUP_TOKEN bearer.
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
    if (!(await isAuthorized(req))) {
      return NextResponse.json(
        { ok: false, error: "admin session or SETUP_TOKEN bearer required" },
        { status: 401 },
      );
    }
    const result = await runVerificationMigration();
    return NextResponse.json({ ok: true, ...result }, { status: 200 });
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
    const status = await verificationMigrationStatus();
    return NextResponse.json({ ok: true, status });
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
