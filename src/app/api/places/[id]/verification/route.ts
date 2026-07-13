import { NextResponse, type NextRequest } from "next/server";

import { getPlaceVerificationSummary } from "@/lib/verification";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Public read API: verification summary for one place (NOC-93). The place
// card renders this server-side via getPlaceVerificationSummary; this route
// exists for client components and future mobile/PWA use.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const placeId = parseInt(id, 10);
  if (!Number.isFinite(placeId) || placeId <= 0) {
    return NextResponse.json(
      { ok: false, error: "invalid place id" },
      { status: 400 },
    );
  }

  try {
    const summary = await getPlaceVerificationSummary(placeId);
    if (!summary) {
      return NextResponse.json(
        { ok: false, error: "place not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, ...summary });
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
