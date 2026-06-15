import { describe, expect, it, vi } from "vitest";

vi.mock("@/db/client", () => ({
  db: {
    execute: vi.fn(async () => [[{ ok: 1 }], []]),
  },
}));

describe("GET /api/health", () => {
  it("returns ok=true and db=reachable when the query succeeds", async () => {
    const { GET } = await import("@/app/api/health/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.db).toBe("reachable");
    expect(body.config).toEqual({
      hasDatabaseUrl: expect.any(Boolean),
      ssl: expect.any(Boolean),
    });
  });
});
