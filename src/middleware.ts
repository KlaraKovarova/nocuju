import { NextResponse, type NextRequest } from "next/server";

const APEX = "nocuju.cz";
const CANONICAL_HOST = "www.nocuju.cz";

function normalizeHost(raw: string | null): string {
  if (!raw) return "";
  const noPort = raw.split(":", 1)[0] ?? "";
  return noPort.toLowerCase();
}

export function middleware(req: NextRequest) {
  const host = normalizeHost(
    req.headers.get("x-forwarded-host") ?? req.headers.get("host"),
  );

  if (host !== APEX) {
    return NextResponse.next();
  }

  const target = new URL(req.nextUrl.toString());
  target.protocol = "https:";
  target.host = CANONICAL_HOST;
  target.port = "";

  return NextResponse.redirect(target, 301);
}

export const config = {
  matcher: "/:path*",
};
