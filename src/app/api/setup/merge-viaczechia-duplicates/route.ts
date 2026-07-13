import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import { mergeViaczechiaCoordinateDuplicates } from "@/lib/places-audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Destructive: merges viaczechia places sharing identical coordinates and
// deletes the duplicate rows (NOC-103). Requires admin session OR Bearer
// SETUP_TOKEN, AND ?confirm=yes. Re-run the viaczechia crawl afterwards to
// refresh the kept place's description with all trail occurrences.
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
        error:
          "missing ?confirm=yes — destructive endpoint refuses to run without explicit confirmation",
      },
      { status: 400 },
    );
  }
  try {
    const result = await mergeViaczechiaCoordinateDuplicates();
    revalidatePath("/objevit");
    revalidatePath("/mapa");
    revalidatePath("/admin/places");
    for (const m of result.merged) {
      revalidatePath(`/misto/${m.keptSlug}`);
      revalidatePath(`/misto/${m.deletedSlug}`);
    }
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
