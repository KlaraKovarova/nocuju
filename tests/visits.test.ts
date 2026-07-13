import { describe, expect, it } from "vitest";

import { isDuplicateEntryError } from "@/db/errors";
import { formatVisitCount, parseVisitedOn, todayIsoDate } from "@/lib/visits";

describe("parseVisitedOn", () => {
  const today = "2026-07-13";

  it("accepts today and past dates", () => {
    expect(parseVisitedOn("2026-07-13", today)).toEqual({
      ok: true,
      date: "2026-07-13",
    });
    expect(parseVisitedOn("2024-02-29", today)).toEqual({
      ok: true,
      date: "2024-02-29",
    });
  });

  it("rejects future dates", () => {
    expect(parseVisitedOn("2026-07-14", today).ok).toBe(false);
  });

  it("rejects garbage, non-existent and ancient dates", () => {
    expect(parseVisitedOn("", today).ok).toBe(false);
    expect(parseVisitedOn("13.7.2026", today).ok).toBe(false);
    expect(parseVisitedOn("2026-02-30", today).ok).toBe(false);
    expect(parseVisitedOn("1999-12-31", today).ok).toBe(false);
  });
});

describe("todayIsoDate", () => {
  it("formats a local date as YYYY-MM-DD", () => {
    expect(todayIsoDate(new Date(2026, 6, 13, 23, 59))).toBe("2026-07-13");
    expect(todayIsoDate(new Date(2026, 0, 2, 0, 1))).toBe("2026-01-02");
  });
});

describe("formatVisitCount (Czech plurals)", () => {
  it.each([
    [0, "0 návštěv komunity"],
    [1, "1 návštěva komunity"],
    [2, "2 návštěvy komunity"],
    [4, "4 návštěvy komunity"],
    [5, "5 návštěv komunity"],
    [123, "123 návštěv komunity"],
  ])("%i", (count, expected) => {
    expect(formatVisitCount(count)).toBe(expected);
  });
});

describe("isDuplicateEntryError", () => {
  it("detects mysql2 duplicate errors directly and via cause chain", () => {
    const driverError = Object.assign(new Error("dup"), {
      code: "ER_DUP_ENTRY",
    });
    expect(isDuplicateEntryError(driverError)).toBe(true);

    const wrapped = Object.assign(new Error("Failed query"), {
      cause: driverError,
    });
    expect(isDuplicateEntryError(wrapped)).toBe(true);
  });

  it("ignores other errors", () => {
    expect(isDuplicateEntryError(new Error("nope"))).toBe(false);
    expect(isDuplicateEntryError(null)).toBe(false);
    expect(
      isDuplicateEntryError(Object.assign(new Error("x"), { code: "ER_LOCK" })),
    ).toBe(false);
  });
});
