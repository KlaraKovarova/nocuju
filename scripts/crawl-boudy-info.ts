/**
 * Crawl boudy.info CZ listings and upsert into `places`.
 *
 * Source: https://www.boudy.info — open database of mountain shelters / bivouacs.
 * Listing: seznam.php?txt=cz&zeme=cz&str=N (~17 pages, 30 entries each = ~483 CZ objects).
 * Detail:  bouda.php?txt=cz&id=N
 *
 * Field mapping (boudy.info → places schema):
 *   name        ← div.nadpis
 *   description ← Popis bullets + paragraph (+ Zdroj vody, Přístup snippets when present)
 *   city        ← last segment of div.podnadpis before "| {elev} m.n.m."
 *   region      ← first segment of podnadpis after "Česká republika"
 *   lat,lng     ← decimal coords from Leaflet `setView([lat, lng], ...)` JS
 *   elevation_m ← number before "m.n.m." in podnadpis
 *   sleeps      ← div.info_pocet (normal capacity; falls back to info_pocet_max)
 *   surface     ← inferred from description keywords (dřev/kamen/hlin/tráv → enum); null otherwise
 *   has_wc      ← description mentions WC / toaleta / záchod
 *   is_free     ← icon cena_1 (Zdarma volně k použití); defaults true
 *   source      ← 'boudy.info'
 *   source_url  ← canonical detail URL
 *
 * Dedupe / idempotency: unique index (source, source_url). Slug is deterministic from
 * name + city; id suffix appended on cross-source slug collisions.
 *
 * Rate limit: 1 request per second (sleep 1000ms between fetches).
 * robots.txt: /robots.txt returns 404 → no restrictions advertised.
 */
import { load } from "cheerio";
import { and, eq, ne, sql } from "drizzle-orm";

import { db, sqlClient } from "../src/db/client";
import {
  categories,
  locations,
  placeCategories,
  places,
  surfaceEnum,
} from "../src/db/schema";

const BASE = "https://www.boudy.info";
const USER_AGENT = "NOC-Crawler/1.0 (+admin@noc.cz)";
const RATE_LIMIT_MS = 1000;
const MAX_PAGES = 20; // safety cap; site reports 17 CZ pages

type SurfaceLiteral = (typeof surfaceEnum)[number];

type CrawledPlace = {
  sourceId: number;
  sourceUrl: string;
  name: string;
  description: string | null;
  city: string;
  region: string | null;
  lat: string;
  lng: string;
  elevationM: number | null;
  sleeps: number | null;
  surface: SurfaceLiteral | null;
  hasWc: boolean;
  isFree: boolean;
  typeCode: string | null; // e.g. "2_2" — used for category mapping
};

let lastFetchAt = 0;

async function rateLimitedFetch(url: string): Promise<string> {
  const wait = RATE_LIMIT_MS - (Date.now() - lastFetchAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastFetchAt = Date.now();
  const res = await fetch(url, { headers: { "user-agent": USER_AGENT } });
  if (!res.ok) {
    throw new Error(`fetch failed ${res.status} ${url}`);
  }
  return await res.text();
}

function collectListingIds(html: string): number[] {
  const $ = load(html);
  const ids = new Set<number>();
  $("a.seznam_link").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const match = href.match(/bouda\.php\?[^"']*id=(\d+)/);
    if (match) ids.add(Number(match[1]));
  });
  return [...ids];
}

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 150);
}

function inferSurface(text: string): SurfaceLiteral | null {
  const t = text.toLowerCase();
  const hits: SurfaceLiteral[] = [];
  if (/dřev|drev/.test(t)) hits.push("drevena");
  if (/kamen/.test(t)) hits.push("kamenna");
  if (/hlin/.test(t)) hits.push("hlinena");
  if (/tráv|trav/.test(t)) hits.push("trava");
  if (hits.length === 0) return null;
  if (hits.length === 1) return hits[0];
  return "mix";
}

function inferHasWc(text: string): boolean {
  return /\b(wc|toaleta|toalety|záchod|zachod)\b/i.test(text);
}

function parseDetail(html: string, id: number): CrawledPlace | null {
  const $ = load(html);
  const name = $(".nadpis").first().text().trim();
  if (!name) return null;

  const subtitleRaw = $(".podnadpis").first().text().trim();
  // Example: "Česká republika, Českomoravská vrchovina, Křemešnická vrchovina, Choustník | 550 m.n.m."
  const [locPart, elevPart] = subtitleRaw.split("|").map((s) => s.trim());
  const elevMatch = elevPart?.match(/(\d+)\s*m\.n\.m\./);
  const elevationM = elevMatch ? Number(elevMatch[1]) : null;

  const locSegments = locPart
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  // [country, range1, range2, city] is typical
  const city = locSegments[locSegments.length - 1] ?? "";
  const region = locSegments[1] ?? null; // first range after country

  // Decimal coords from Leaflet setView([lat, lng], zoom)
  const setViewMatch = html.match(
    /setView\(\s*\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]/,
  );
  if (!setViewMatch) return null;
  const lat = setViewMatch[1];
  const lng = setViewMatch[2];

  const pocet = Number($(".info_pocet").first().text().trim());
  const pocetMax = Number($(".info_pocet_max").first().text().trim());
  const sleeps = Number.isFinite(pocet) && pocet > 0
    ? pocet
    : Number.isFinite(pocetMax) && pocetMax > 0
      ? pocetMax
      : null;

  // Active type icon: img with class info_ik_{group} (no _v suffix), src bouda_X_Y.png
  let typeCode: string | null = null;
  $(".info_ik_trida_druh img").each((_, el) => {
    const src = $(el).attr("src") ?? "";
    const m = src.match(/bouda_(\d_\d)\.png$/);
    if (m && !typeCode) typeCode = m[1];
  });

  // Cost icon
  let isFree = true;
  $(".info_ik").each((_, el) => {
    const src = $(el).attr("src") ?? "";
    const m = src.match(/cena_(\d)\.png$/);
    if (m) isFree = m[1] === "1";
  });

  // Collect description text from popis_ul + popis_txt blocks under popis_nadpis "Popis"
  const descParts: string[] = [];
  let collecting = false;
  $(".sloupek_L_P")
    .children()
    .each((_, el) => {
      const $el = $(el);
      if ($el.hasClass("popis_nadpis")) {
        collecting = $el.text().trim() === "Popis";
        return;
      }
      if (!collecting) return;
      if ($el.hasClass("popis_ul")) {
        $el.find("li").each((__, li) => {
          const t = $(li).text().trim();
          if (t && t !== "1" && t !== "...") descParts.push(`- ${t}`);
        });
      } else if ($el.hasClass("popis_txt")) {
        const t = $el.text().trim();
        if (t && t !== "1" && t !== "...") descParts.push(t);
      } else if ($el.hasClass("popis_upravit")) {
        return;
      }
    });
  const description = descParts.length > 0 ? descParts.join("\n\n") : null;

  // Combined free text for keyword inference
  const fullText = $(".sloupek_L_P").text();

  return {
    sourceId: id,
    sourceUrl: `${BASE}/bouda.php?txt=cz&id=${id}`,
    name,
    description,
    city,
    region,
    lat,
    lng,
    elevationM,
    sleeps,
    surface: inferSurface(fullText),
    hasWc: inferHasWc(fullText),
    isFree,
    typeCode,
  };
}

async function upsertLocation(city: string, region: string | null): Promise<number> {
  const existing = await db
    .select({ id: locations.id })
    .from(locations)
    .where(eq(locations.city, city));
  if (existing[0]) return Number(existing[0].id);
  await db.insert(locations).values({ city, region: region ?? null, country: "CZ" });
  const [row] = await db
    .select({ id: locations.id })
    .from(locations)
    .where(eq(locations.city, city));
  return Number(row!.id);
}

async function upsertCategory(slug: string, name: string): Promise<number> {
  const existing = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, slug));
  if (existing[0]) return Number(existing[0].id);
  await db.insert(categories).values({ slug, name });
  const [row] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, slug));
  return Number(row!.id);
}

function categoryForType(typeCode: string | null): string | null {
  if (!typeCode) return null;
  const group = typeCode.split("_")[0];
  // 1_* = bivak; 2_0..2_2 = open shelters; 2_3/2_4 = closed huts; 3_* = mountain hotels.
  if (group === "1") return "nouzove-nocoviste";
  if (group === "2") {
    const sub = typeCode.split("_")[1];
    return sub === "3" || sub === "4" ? "utulna" : "nouzove-nocoviste";
  }
  if (group === "3") return "utulna";
  return null;
}

async function resolveSlug(
  baseSlug: string,
  sourceUrl: string,
  sourceId: number,
): Promise<string> {
  // If a place already owns this slug for a *different* source_url, suffix with id.
  const clash = await db
    .select({ id: places.id })
    .from(places)
    .where(
      and(
        eq(places.slug, baseSlug),
        ne(places.sourceUrl, sourceUrl),
      ),
    );
  if (clash.length === 0) return baseSlug;
  const suffixed = `${baseSlug}-${sourceId}`.slice(0, 160);
  return suffixed;
}

async function upsertPlace(
  p: CrawledPlace,
  locationId: number,
  categoryIdBySlug: Map<string, number>,
): Promise<"created" | "updated"> {
  const existing = await db
    .select({ id: places.id, slug: places.slug })
    .from(places)
    .where(
      and(eq(places.source, "boudy.info"), eq(places.sourceUrl, p.sourceUrl)),
    );

  const baseSlug = slugify(`${p.name}-${p.city}`) || `bouda-${p.sourceId}`;

  if (existing[0]) {
    const id = Number(existing[0].id);
    await db
      .update(places)
      .set({
        // keep existing slug on update to avoid breaking links
        name: p.name,
        description: p.description ?? null,
        locationId,
        lat: p.lat,
        lng: p.lng,
        elevationM: p.elevationM ?? null,
        sleeps: p.sleeps ?? null,
        surface: p.surface ?? null,
        hasWc: p.hasWc,
        isFree: p.isFree,
        source: "boudy.info",
        sourceUrl: p.sourceUrl,
      })
      .where(eq(places.id, id));
    return "updated";
  }

  const slug = await resolveSlug(baseSlug, p.sourceUrl, p.sourceId);

  await db.insert(places).values({
    slug,
    name: p.name,
    description: p.description ?? null,
    locationId,
    lat: p.lat,
    lng: p.lng,
    elevationM: p.elevationM ?? null,
    sleeps: p.sleeps ?? null,
    surface: p.surface ?? null,
    hasWc: p.hasWc,
    isFree: p.isFree,
    source: "boudy.info",
    sourceUrl: p.sourceUrl,
  });

  const [row] = await db
    .select({ id: places.id })
    .from(places)
    .where(
      and(eq(places.source, "boudy.info"), eq(places.sourceUrl, p.sourceUrl)),
    );
  const newId = Number(row!.id);

  const catSlug = categoryForType(p.typeCode);
  if (catSlug) {
    const categoryId = categoryIdBySlug.get(catSlug);
    if (categoryId) {
      await db
        .insert(placeCategories)
        .values({ placeId: newId, categoryId })
        .onDuplicateKeyUpdate({ set: { placeId: newId } });
    }
  }

  return "created";
}

async function main() {
  // Ensure baseline categories exist (matches seed.ts).
  const categoryIdBySlug = new Map<string, number>();
  categoryIdBySlug.set(
    "utulna",
    await upsertCategory("utulna", "Útulna"),
  );
  categoryIdBySlug.set(
    "nouzove-nocoviste",
    await upsertCategory("nouzove-nocoviste", "Nouzové nocoviště"),
  );

  // Step 1: collect all detail IDs across paginated CZ listing.
  const allIds = new Set<number>();
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `${BASE}/seznam.php?txt=cz&zeme=cz&str=${page}`;
    let html: string;
    try {
      html = await rateLimitedFetch(url);
    } catch (err) {
      console.warn(`listing page ${page} fetch failed: ${(err as Error).message}`);
      break;
    }
    const ids = collectListingIds(html);
    const before = allIds.size;
    for (const id of ids) allIds.add(id);
    const added = allIds.size - before;
    console.log(
      `[listing] page ${page}: ${ids.length} links, +${added} new (total ${allIds.size})`,
    );
    if (added === 0 && page > 1) {
      // pagination has run out (no new IDs surfaced beyond cross-links)
      break;
    }
  }

  console.log(`[listing] collected ${allIds.size} unique detail IDs`);

  // Step 2: crawl each detail page and upsert.
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: Array<{ id: number; error: string }> = [];

  const ids = [...allIds].sort((a, b) => a - b);
  for (const [idx, id] of ids.entries()) {
    const url = `${BASE}/bouda.php?txt=cz&id=${id}`;
    try {
      const html = await rateLimitedFetch(url);
      const parsed = parseDetail(html, id);
      if (!parsed) {
        skipped += 1;
        console.warn(`[skip] ${id}: could not parse name or coords`);
        continue;
      }
      const locationId = await upsertLocation(parsed.city, parsed.region);
      const result = await upsertPlace(parsed, locationId, categoryIdBySlug);
      if (result === "created") created += 1;
      else updated += 1;
      if ((idx + 1) % 25 === 0 || idx === ids.length - 1) {
        console.log(
          `[progress] ${idx + 1}/${ids.length} — created=${created} updated=${updated} skipped=${skipped} errors=${errors.length}`,
        );
      }
    } catch (err) {
      errors.push({ id, error: (err as Error).message });
      console.warn(`[error] id=${id}: ${(err as Error).message}`);
    }
  }

  const [{ count }] = (await db
    .select({ count: sql<number>`count(*)` })
    .from(places)
    .where(eq(places.source, "boudy.info"))) as Array<{ count: number }>;

  console.log("");
  console.log("=== crawl summary ===");
  console.log(`detail IDs:    ${ids.length}`);
  console.log(`created:       ${created}`);
  console.log(`updated:       ${updated}`);
  console.log(`skipped:       ${skipped}`);
  console.log(`errors:        ${errors.length}`);
  console.log(`boudy.info rows in DB: ${count}`);
  if (errors.length > 0) {
    console.log("");
    console.log("first 10 errors:");
    for (const e of errors.slice(0, 10)) console.log(`  ${e.id}: ${e.error}`);
  }
}

main()
  .then(async () => {
    await sqlClient.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error(err);
    try {
      await sqlClient.end();
    } catch {}
    process.exit(1);
  });
