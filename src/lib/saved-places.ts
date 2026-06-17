export const SAVED_PLACES_KEY = "nocuju:saves:v1";
export const SAVED_PLACES_EVENT = "nocuju:saves-changed";

export type SavedPlace = {
  slug: string;
  savedAt: number;
};

export function readSavedPlaces(): SavedPlace[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SAVED_PLACES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const out: SavedPlace[] = [];
    for (const entry of parsed) {
      let slug: string | null = null;
      let savedAt: number | null = null;
      if (typeof entry === "string") {
        slug = entry;
      } else if (entry && typeof entry === "object") {
        const obj = entry as { slug?: unknown; savedAt?: unknown };
        if (typeof obj.slug === "string") slug = obj.slug;
        if (typeof obj.savedAt === "number") savedAt = obj.savedAt;
      }
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);
      out.push({ slug, savedAt: savedAt ?? Date.now() });
    }
    return out;
  } catch {
    return [];
  }
}

export function writeSavedPlaces(saves: SavedPlace[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SAVED_PLACES_KEY, JSON.stringify(saves));
    window.dispatchEvent(new CustomEvent(SAVED_PLACES_EVENT));
  } catch {
    // private mode / quota — best effort only
  }
}

export function toggleSavedPlace(slug: string): SavedPlace[] {
  const current = readSavedPlaces();
  const exists = current.some((s) => s.slug === slug);
  const next = exists
    ? current.filter((s) => s.slug !== slug)
    : [...current, { slug, savedAt: Date.now() }];
  writeSavedPlaces(next);
  return next;
}

export function removeSavedPlace(slug: string): SavedPlace[] {
  const current = readSavedPlaces();
  const next = current.filter((s) => s.slug !== slug);
  writeSavedPlaces(next);
  return next;
}
