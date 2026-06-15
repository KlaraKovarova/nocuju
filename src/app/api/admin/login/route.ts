import { NextResponse, type NextRequest } from "next/server";

import {
  buildSessionCookie,
  getExpectedPassword,
  signAdminSession,
} from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function sanitizeNext(value: string | null): string {
  if (!value) return "/admin/places";
  return value.startsWith("/admin") ? value : "/admin/places";
}

function redirectResponse(url: URL): NextResponse {
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  const next = sanitizeNext(String(form.get("next") ?? ""));

  const loginUrl = new URL("/admin/login", request.url);

  if (password !== getExpectedPassword()) {
    loginUrl.searchParams.set("error", "1");
    if (next !== "/admin/places") loginUrl.searchParams.set("next", next);
    return redirectResponse(loginUrl);
  }

  const token = await signAdminSession();
  const targetUrl = new URL(next, request.url);
  const response = redirectResponse(targetUrl);
  response.cookies.set(buildSessionCookie(token));
  return response;
}
