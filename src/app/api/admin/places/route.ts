import { type NextRequest, type NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import { seeOther } from "@/lib/redirects";

import {
  FormError,
  assertSlugAvailable,
  createPlace,
  parseForm,
} from "@/app/admin/places/_lib/places-write";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function loginRedirect(): NextResponse {
  const query = new URLSearchParams({ next: "/admin/places/new" });
  return seeOther(`/admin/login?${query}`);
}

function errorRedirect(message: string): NextResponse {
  const query = new URLSearchParams({ error: message });
  return seeOther(`/admin/places/new?${query}`);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!(await isAdminAuthenticated())) return loginRedirect();

  const formData = await request.formData();
  try {
    const parsed = parseForm(formData);
    await assertSlugAvailable(parsed.slug, null);
    const placeId = await createPlace(parsed);

    revalidatePath("/admin/places");
    revalidatePath("/objevit");
    revalidatePath("/mapa");
    revalidatePath(`/misto/${parsed.slug}`);

    return seeOther(`/admin/places/${placeId}?saved=1`);
  } catch (err) {
    if (err instanceof FormError) {
      return errorRedirect(err.message);
    }
    throw err;
  }
}
