import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

function makeReq(url: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(new URL(url), {
    headers: new Headers(headers),
  });
}

describe("apex → www redirect middleware", () => {
  it("301-redirects apex root to www and is uncacheable", () => {
    const res = middleware(makeReq("https://nocuju.cz/", { host: "nocuju.cz" }));
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("https://www.nocuju.cz/");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("preserves path and query when redirecting", () => {
    const res = middleware(
      makeReq("https://nocuju.cz/objevit?kraj=jihocesky", { host: "nocuju.cz" }),
    );
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe(
      "https://www.nocuju.cz/objevit?kraj=jihocesky",
    );
  });

  it("honours x-forwarded-host over host", () => {
    const res = middleware(
      makeReq("https://internal.example/api/health", {
        host: "internal.example",
        "x-forwarded-host": "nocuju.cz",
      }),
    );
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("https://www.nocuju.cz/api/health");
  });

  it("ignores www host (no redirect loop)", () => {
    const res = middleware(
      makeReq("https://www.nocuju.cz/mapa", { host: "www.nocuju.cz" }),
    );
    expect(res.status).not.toBe(301);
  });

  it("ignores unrelated hosts", () => {
    const res = middleware(
      makeReq("http://localhost:3000/", { host: "localhost:3000" }),
    );
    expect(res.status).not.toBe(301);
  });

  it("strips port from host header before matching", () => {
    const res = middleware(
      makeReq("https://nocuju.cz:443/", { host: "nocuju.cz:443" }),
    );
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("https://www.nocuju.cz/");
  });
});
