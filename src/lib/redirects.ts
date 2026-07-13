import { NextResponse } from "next/server";

// Hostinger's LiteSpeed proxy spawns the standalone server on a loopback
// origin, so `request.url` in route handlers is `http://0.0.0.0:3000/...`
// and absolute redirects built from it point at an unreachable host
// (NOC-102). A relative Location resolves against whatever public host the
// browser is on, so form-POST flows keep working behind the proxy.
export function seeOther(location: string): NextResponse {
  return new NextResponse(null, {
    status: 303,
    headers: { Location: location },
  });
}
