// Community visits ("Byl(a) jsem tam", NOC-97). Deliberately informal
// wording — visit counts must never read as the official "Ověřeno" badge,
// which is reserved for internal admin verification (NOC-92/NOC-93).

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MIN_VISIT_DATE = "2000-01-01";

export function todayIsoDate(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export type VisitDateResult =
  | { ok: true; date: string }
  | { ok: false; error: string };

export function parseVisitedOn(
  raw: string,
  today: string = todayIsoDate(),
): VisitDateResult {
  const value = raw.trim();
  if (!DATE_RE.test(value)) {
    return { ok: false, error: "Zadej datum návštěvy." };
  }
  const [y, m, d] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(y, m - 1, d));
  const roundTrips =
    parsed.getUTCFullYear() === y &&
    parsed.getUTCMonth() === m - 1 &&
    parsed.getUTCDate() === d;
  if (!roundTrips) {
    return { ok: false, error: "Tohle datum neexistuje." };
  }
  if (value > today) {
    return { ok: false, error: "Datum návštěvy nemůže být v budoucnosti." };
  }
  if (value < MIN_VISIT_DATE) {
    return { ok: false, error: "Datum návštěvy je moc daleko v minulosti." };
  }
  return { ok: true, date: value };
}

// Czech pluralization: 1 návštěva, 2–4 návštěvy, 0 & 5+ návštěv.
export function formatVisitCount(count: number): string {
  if (count === 1) return "1 návštěva komunity";
  if (count >= 2 && count <= 4) return `${count} návštěvy komunity`;
  return `${count} návštěv komunity`;
}
