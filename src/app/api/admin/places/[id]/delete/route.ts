import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";

import { isAdminAuthenticated } from "@/lib/admin-auth";
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
    return NextResponse.redirect(new URL("/admin/places", request.url), 303);
  }

  if (!(await isAdminAuthenticated())) {
    const url = new URL("/admin/login", request.url);
    url.searchParams.set("next", "/admin/places");
    return NextResponse.redirect(url, 303);
  }

  const removedSlug = await deletePlace(placeId);

  revalidatePath("/admin/places");
  revalidatePath("/objevit");
  revalidatePath("/mapa");
  if (removedSlug) revalidatePath(`/misto/${removedSlug}`);

  const target = new URL("/admin/places", request.url);
  target.searchParams.set("deleted", "1");
  return NextResponse.redirect(target, 303);
}
