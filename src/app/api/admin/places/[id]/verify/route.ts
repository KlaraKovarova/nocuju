import { type NextRequest, type NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { places } from "@/db/schema";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { seeOther } from "@/lib/redirects";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Internal verification (NOC-98, variant 2 from NOC-92): the only kind of
// check that renders as "Ověřeno" on the public place card. `intent=verify`
// stamps admin_verified_at/by/note, `intent=unverify` clears all three.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const placeId = parseInt(id, 10);
  if (!Number.isFinite(placeId) || placeId <= 0) {
    return seeOther("/admin/places");
  }

  if (!(await isAdminAuthenticated())) {
    const query = new URLSearchParams({ next: `/admin/places/${placeId}` });
    return seeOther(`/admin/login?${query}`);
  }

  const rows = await db
    .select({ slug: places.slug })
    .from(places)
    .where(eq(places.id, placeId))
    .limit(1);
  const place = rows[0];
  if (!place) return seeOther("/admin/places");

  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "verify");

  if (intent === "unverify") {
    await db
      .update(places)
      .set({
        adminVerifiedAt: null,
        adminVerifiedBy: null,
        adminVerifiedNote: null,
      })
      .where(eq(places.id, placeId));
  } else {
    const by =
      String(formData.get("verifiedBy") ?? "")
        .trim()
        .slice(0, 128) || "admin";
    const note = String(formData.get("note") ?? "")
      .trim()
      .slice(0, 500);
    await db
      .update(places)
      .set({
        adminVerifiedAt: new Date(),
        adminVerifiedBy: by,
        adminVerifiedNote: note || null,
      })
      .where(eq(places.id, placeId));
  }

  revalidatePath("/admin/places");
  revalidatePath("/objevit");
  revalidatePath("/mapa");
  revalidatePath(`/misto/${place.slug}`);

  const flag = intent === "unverify" ? "unverified" : "verified";
  return seeOther(`/admin/places/${placeId}?${flag}=1`);
}
