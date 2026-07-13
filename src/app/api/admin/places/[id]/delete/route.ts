import { type NextRequest, type NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import { seeOther } from "@/lib/redirects";
import { deletePlace } from "@/app/admin/places/_lib/places-write";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
    const query = new URLSearchParams({ next: "/admin/places" });
    return seeOther(`/admin/login?${query}`);
  }

  const removedSlug = await deletePlace(placeId);

  revalidatePath("/admin/places");
  revalidatePath("/objevit");
  revalidatePath("/mapa");
  if (removedSlug) revalidatePath(`/misto/${removedSlug}`);

  return seeOther("/admin/places?deleted=1");
}
