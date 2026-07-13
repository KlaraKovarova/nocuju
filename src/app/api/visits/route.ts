import { eq } from "drizzle-orm";
import { type NextRequest, type NextResponse } from "next/server";

import { db } from "@/db/client";
import { isDuplicateEntryError } from "@/db/errors";
import { places, placeVisits } from "@/db/schema";
import { seeOther } from "@/lib/redirects";
import { getSessionUser } from "@/lib/user-auth";
import { parseVisitedOn } from "@/lib/visits";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function redirectToPlace(
  slug: string,
  params: Record<string, string>,
): NextResponse {
  const query = new URLSearchParams(params);
  return seeOther(`/misto/${encodeURIComponent(slug)}?${query}#navsteva`);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const form = await request.formData();
  const placeId = Number(form.get("placeId"));
  const visitedOnRaw = String(form.get("visitedOn") ?? "");

  if (!Number.isInteger(placeId) || placeId <= 0) {
    return seeOther("/");
  }

  // Resolve the slug from the DB so the redirect target can't be spoofed
  // through the form.
  const placeRows = await db
    .select({ id: places.id, slug: places.slug })
    .from(places)
    .where(eq(places.id, placeId))
    .limit(1);
  const place = placeRows[0];
  if (!place) return seeOther("/");

  const user = await getSessionUser();
  if (!user) {
    const query = new URLSearchParams({ next: `/misto/${place.slug}#navsteva` });
    return seeOther(`/ucet/prihlaseni?${query}`);
  }

  const parsed = parseVisitedOn(visitedOnRaw);
  if (!parsed.ok) {
    return redirectToPlace(place.slug, { visitError: parsed.error });
  }

  try {
    await db.insert(placeVisits).values({
      placeId,
      userId: user.id,
      visitedOn: parsed.date,
    });
  } catch (error) {
    // Unique index place_visits_place_user_day_uq: max one visit per user,
    // place, and day (NOC-93). A repeat is not an error worth surfacing red.
    if (isDuplicateEntryError(error)) {
      return redirectToPlace(place.slug, { visitDuplicate: "1" });
    }
    throw error;
  }

  return redirectToPlace(place.slug, { visitSaved: "1" });
}
