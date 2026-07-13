import { type NextRequest, type NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import { seeOther } from "@/lib/redirects";

import {
  FormError,
  assertSlugAvailable,
  parseForm,
  updatePlace,
} from "@/app/admin/places/_lib/places-write";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function loginRedirect(next: string): NextResponse {
  const query = new URLSearchParams({ next });
  return seeOther(`/admin/login?${query}`);
}

function errorRedirect(placeId: number, message: string): NextResponse {
  const query = new URLSearchParams({ error: message });
  return seeOther(`/admin/places/${placeId}?${query}`);
}

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
    return loginRedirect(`/admin/places/${placeId}`);
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

    return seeOther(`/admin/places/${placeId}?saved=1`);
  } catch (err) {
    if (err instanceof FormError) {
      return errorRedirect(placeId, err.message);
    }
    throw err;
  }
}
