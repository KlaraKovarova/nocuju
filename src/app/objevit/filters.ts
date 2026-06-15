import { surfaceEnum } from "@/db/schema";

export type ParsedFilters = {
  categories: string[];
  surfaces: string[];
  wc: "yes" | "no" | null;
  sleepsMin: number | null;
  page: number;
};

export const PAGE_SIZE = 24;
const KNOWN_CATEGORIES = ["utulna", "nouzove-nocoviste"] as const;
const KNOWN_SURFACES = new Set<string>(surfaceEnum);

function toArray(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export function parseFilters(searchParams: {
  [key: string]: string | string[] | undefined;
}): ParsedFilters {
  const categories = uniq(toArray(searchParams.kategorie)).filter(
    (slug): slug is (typeof KNOWN_CATEGORIES)[number] =>
      (KNOWN_CATEGORIES as readonly string[]).includes(slug),
  );
  const surfaces = uniq(toArray(searchParams.povrch)).filter((s) =>
    KNOWN_SURFACES.has(s),
  );
  const wcRaw = Array.isArray(searchParams.wc)
    ? searchParams.wc[0]
    : searchParams.wc;
  const wc: ParsedFilters["wc"] =
    wcRaw === "yes" ? "yes" : wcRaw === "no" ? "no" : null;
  const sleepsMinRaw = Array.isArray(searchParams.sleeps_min)
    ? searchParams.sleeps_min[0]
    : searchParams.sleeps_min;
  const sleepsMinParsed = sleepsMinRaw ? parseInt(sleepsMinRaw, 10) : NaN;
  const sleepsMin =
    Number.isFinite(sleepsMinParsed) && sleepsMinParsed > 0
      ? sleepsMinParsed
      : null;

  const pageRaw = Array.isArray(searchParams.stranka)
    ? searchParams.stranka[0]
    : searchParams.stranka;
  const pageParsed = pageRaw ? parseInt(pageRaw, 10) : 1;
  const page =
    Number.isFinite(pageParsed) && pageParsed > 0 ? pageParsed : 1;

  return { categories, surfaces, wc, sleepsMin, page };
}

export function buildPageHref(filters: ParsedFilters, page: number): string {
  const sp = new URLSearchParams();
  for (const c of filters.categories) sp.append("kategorie", c);
  for (const s of filters.surfaces) sp.append("povrch", s);
  if (filters.wc) sp.set("wc", filters.wc);
  if (filters.sleepsMin) sp.set("sleeps_min", String(filters.sleepsMin));
  if (page > 1) sp.set("stranka", String(page));
  const qs = sp.toString();
  return qs ? `/objevit?${qs}` : "/objevit";
}
