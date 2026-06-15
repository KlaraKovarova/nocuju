import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";

import { isAdminAuthenticated } from "@/lib/admin-auth";

import {
  FormError,
  assertSlugAvailable,
  parseForm,
  updatePlace,
} from "@/app/admin/places/_lib/places-write";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function loginRedirect(request: NextRequest, next: string): NextResponse {
  const url = new URL("/admin/login", request.url);
  url.searchParams.set("next", next);
  return NextResponse.redirect(url, 303);
}

function errorRedirect(
  request: NextRequest,
  placeId: number,
  message: string,
): NextResponse {
  const url = new URL(`/admin/places/${placeId}`, request.url);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url, 303);
}

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
    return loginRedirect(request, `/admin/places/${placeId}`);
  }

  const formData = await request.formData();
  try {
    const parsed = parseForm(formData);
    await assertSlugAvailable(parsed.slug, placeId);
    const oldSlug = await updatePlace(placeId, parsed);

    revalidatePath("/admin/places");
    revalidatePath("/objevit");
    revalidatePath("/mapa");
    revalidatePath(`/misto/${parsed.slug}`);
    if (oldSlug) revalidatePath(`/misto/${oldSlug}`);

    const target = new URL(`/admin/places/${placeId}`, request.url);
    target.searchParams.set("saved", "1");
    return NextResponse.redirect(target, 303);
  } catch (err) {
    if (err instanceof FormError) {
      return errorRedirect(request, placeId, err.message);
    }
    throw err;
  }
}
