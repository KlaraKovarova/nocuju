import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

import { ADMIN_COOKIE } from "@/lib/admin-auth";
import {
  ANALYTICS_COOKIE,
  ANALYTICS_COOKIE_MAX_AGE,
  newSessionId,
  recordPageview,
  shouldTrackPath,
} from "@/lib/analytics";

const ISSUER = "noc-admin";

function secretKey(): Uint8Array | null {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 16) return null;
  return new TextEncoder().encode(secret);
}

async function isTokenValid(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const key = secretKey();
  if (!key) return false;
  try {
    await jwtVerify(token, key, { issuer: ISSUER });
    return true;
  } catch {
    return false;
  }
}

async function handleAdmin(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login") return NextResponse.next();

  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  if (await isTokenValid(token)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = "";
  if (pathname !== "/admin") url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

function trackPageview(
  request: NextRequest,
  event: NextFetchEvent,
): NextResponse {
  const { pathname } = request.nextUrl;

  let sessionId = request.cookies.get(ANALYTICS_COOKIE)?.value;
  const isNewSession = !sessionId;
  if (!sessionId) sessionId = newSessionId();

  const response = NextResponse.next();
  response.cookies.set({
    name: ANALYTICS_COOKIE,
    value: sessionId,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ANALYTICS_COOKIE_MAX_AGE,
  });

  if (request.method === "GET") {
    event.waitUntil(
      recordPageview({
        path: pathname,
        referrer: request.headers.get("referer"),
        userAgent: request.headers.get("user-agent"),
        sessionId,
      }),
    );
  }

  // Surface session-new state in case future code wants it; not used today.
  void isNewSession;
  return response;
}

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    return handleAdmin(request);
  }

  if (shouldTrackPath(pathname)) {
    return trackPageview(request, event);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    {
      source:
        "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
