import { type NextRequest, type NextResponse } from "next/server";

import {
  buildSessionCookie,
  getExpectedPassword,
  signAdminSession,
} from "@/lib/admin-auth";
import { seeOther } from "@/lib/redirects";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function sanitizeNext(value: string | null): string {
  if (!value || !value.startsWith("/admin")) return "/admin/places";
  // Normalize through URL so `..` segments and raw control characters can't
  // escape /admin or corrupt the Location header.
  const url = new URL(value, "http://sanitize.invalid");
  const path = url.pathname + url.search;
  return path.startsWith("/admin") ? path : "/admin/places";
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  const next = sanitizeNext(String(form.get("next") ?? ""));

  if (password !== getExpectedPassword()) {
    const query = new URLSearchParams({ error: "1" });
    if (next !== "/admin/places") query.set("next", next);
    return seeOther(`/admin/login?${query}`);
  }

  const token = await signAdminSession();
  const response = seeOther(next);
  response.cookies.set(buildSessionCookie(token));
  return response;
}
