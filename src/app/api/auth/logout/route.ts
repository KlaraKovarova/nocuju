import { type NextRequest, type NextResponse } from "next/server";

import { seeOther } from "@/lib/redirects";
import { clearUserSessionCookie, sanitizeNextPath } from "@/lib/user-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const form = await request.formData();
  const next = sanitizeNextPath(String(form.get("next") ?? ""));
  const response = seeOther(next);
  response.cookies.set(clearUserSessionCookie());
  return response;
}
