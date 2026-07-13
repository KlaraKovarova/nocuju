import { describe, expect, it } from "vitest";

import {
  hashPassword,
  sanitizeNextPath,
  verifyPassword,
} from "@/lib/user-auth";

describe("password hashing", () => {
  it("verifies a correct password", async () => {
    const stored = await hashPassword("správné-heslo-123");
    expect(stored.startsWith("scrypt:")).toBe(true);
    expect(await verifyPassword("správné-heslo-123", stored)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const stored = await hashPassword("správné-heslo-123");
    expect(await verifyPassword("špatné-heslo", stored)).toBe(false);
  });

  it("produces a different salt per hash", async () => {
    const a = await hashPassword("stejné");
    const b = await hashPassword("stejné");
    expect(a).not.toBe(b);
  });

  it("rejects malformed stored hashes", async () => {
    expect(await verifyPassword("x", "")).toBe(false);
    expect(await verifyPassword("x", "plaintext")).toBe(false);
    expect(await verifyPassword("x", "bcrypt:a:b:c:d:e")).toBe(false);
    expect(await verifyPassword("x", "scrypt:0:8:1:c2FsdA==:aGFzaA==")).toBe(
      false,
    );
  });
});

describe("sanitizeNextPath", () => {
  it("keeps normal on-site paths", () => {
    expect(sanitizeNextPath("/misto/lucni-bouda#navsteva")).toBe(
      "/misto/lucni-bouda#navsteva",
    );
    expect(sanitizeNextPath("/ucet?a=1", "/x")).toBe("/ucet?a=1");
  });

  it("falls back on off-site or malformed targets", () => {
    expect(sanitizeNextPath(null)).toBe("/");
    expect(sanitizeNextPath("https://evil.example")).toBe("/");
    expect(sanitizeNextPath("//evil.example")).toBe("/");
    expect(sanitizeNextPath("/\\evil.example")).toBe("/");
    expect(sanitizeNextPath("javascript:alert(1)")).toBe("/");
    expect(sanitizeNextPath("relative/path", "/fallback")).toBe("/fallback");
  });
});
