import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import { cleanupSeedPlaces } from "@/lib/places-audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Destructive: removes every place where source_url starts with 'seed://'.
// Requires admin session OR Bearer SETUP_TOKEN, AND ?confirm=yes so it cannot
// be triggered by accident from a misconfigured monitor or stale tab.
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
  if (!(await isAuthorized(req))) {
    return NextResponse.json(
      { ok: false, error: "admin session or SETUP_TOKEN bearer required" },
      { status: 401 },
    );
  }
  const url = new URL(req.url);
  if (url.searchParams.get("confirm") !== "yes") {
    return NextResponse.json(
      {
        ok: false,
        error: "missing ?confirm=yes — destructive endpoint refuses to run without explicit confirmation",
      },
      { status: 400 },
    );
  }
  try {
    const result = await cleanupSeedPlaces();
    revalidatePath("/objevit");
    revalidatePath("/mapa");
    revalidatePath("/admin/places");
    for (const slug of result.deletedSlugs) {
      revalidatePath(`/misto/${slug}`);
    }
    return NextResponse.json({ ok: true, ...result }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
