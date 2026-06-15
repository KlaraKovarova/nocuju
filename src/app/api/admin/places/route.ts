import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";

import { isAdminAuthenticated } from "@/lib/admin-auth";

import {
  FormError,
  assertSlugAvailable,
  createPlace,
  parseForm,
} from "@/app/admin/places/_lib/places-write";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function loginRedirect(request: NextRequest): NextResponse {
  const url = new URL("/admin/login", request.url);
  url.searchParams.set("next", "/admin/places/new");
  return NextResponse.redirect(url, 303);
}

function errorRedirect(request: NextRequest, message: string): NextResponse {
  const url = new URL("/admin/places/new", request.url);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!(await isAdminAuthenticated())) return loginRedirect(request);

  const formData = await request.formData();
  try {
    const parsed = parseForm(formData);
    await assertSlugAvailable(parsed.slug, null);
    const placeId = await createPlace(parsed);

    revalidatePath("/admin/places");
    revalidatePath("/objevit");
    revalidatePath("/mapa");
    revalidatePath(`/misto/${parsed.slug}`);

    const target = new URL(`/admin/places/${placeId}`, request.url);
    target.searchParams.set("saved", "1");
    return NextResponse.redirect(target, 303);
  } catch (err) {
    if (err instanceof FormError) {
      return errorRedirect(request, err.message);
    }
    throw err;
  }
}
