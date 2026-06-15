/**
 * Crawl viaczechia.cz/utulny and upsert into `places`.
 *
 * Source: https://viaczechia.cz/utulny/ — single-page table listing útulen along
 * the Via Czechia long-distance trails. Each row provides name, úsek, stezka,
 * stage number, km on trail, mapy.cz short link, and DMS coordinates inline.
 *
 * No per-útulna detail page exists, so the crawler does one listing fetch and
 * extracts everything from the table. The same physical útulna appears multiple
 * times when it sits on more than one stezka — we group by mapy.cz URL so each
 * physical place becomes a single row.
 *
 * Field mapping (viaczechia row → places schema):
 *   name        ← <td>Název útulny</td>
 *   description ← stezky + úsek + stage + km lines, one per occurrence
 *   region      ← úsek (no per-place city in the table, locationId stays null)
 *   lat,lng     ← DMS coords in the Poloha cell, converted to decimal
 *   source      ← 'viaczechia'
 *   source_url  ← mapy.cz short URL (unique per physical útulna)
 *
 * Dedupe / idempotency: unique index (source, source_url). Cross-source
 * dedupe vs boudy.info uses name token overlap + 100 m Haversine threshold —
 * matching rows are logged and skipped (no auto-merge).
 *
 * Rate limit: 1 request per second (sleep 1000 ms between fetches). Only one
 * fetch is needed in practice; the gate stays in place for future expansion.
 * robots.txt: allows everything except /wp-admin/.
 */
import { load } from "cheerio";
import { and, eq, sql } from "drizzle-orm";

import { db, sqlClient } from "../src/db/client";
import { categories, placeCategories, places } from "../src/db/schema";

const LISTING_URL = "https://viaczechia.cz/utulny/";
const USER_AGENT = "NOC-Crawler/1.0 (+admin@noc.cz)";
const RATE_LIMIT_MS = 1000;
const DUPE_DISTANCE_M = 100;

type Occurrence = {
  stezka: string;
  usek: string;
  etapa: string;
  km: string;
};

type CrawledPlace = {
  name: string;
  lat: string;
  lng: string;
  sourceUrl: string; // mapy.cz short URL
  occurrences: Occurrence[];
};

let lastFetchAt = 0;

async function rateLimitedFetch(url: string): Promise<string> {
  const wait = RATE_LIMIT_MS - (Date.now() - lastFetchAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastFetchAt = Date.now();
  const res = await fetch(url, { headers: { "user-agent": USER_AGENT } });
  if (!res.ok) throw new Error(`fetch failed ${res.status} ${url}`);
  return await res.text();
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

// DMS like "50°21'16.981\"N, 12°33'24.856\"E" (with curly/typographic quotes).
function parseDms(raw: string): { lat: number; lng: number } | null {
  const text = raw
    .replace(/[\u2032\u2019']/g, "'") // primes / curly quotes → '
    .replace(/[\u2033\u201d\u201c"]/g, '"') // double primes / curly quotes → "
    .replace(/\s+/g, " ")
    .trim();
  const re =
    /(\d+)°\s*(\d+)'\s*([\d.]+)"\s*([NS])\s*[, ]\s*(\d+)°\s*(\d+)'\s*([\d.]+)"\s*([EW])/i;
  const m = text.match(re);
  if (!m) return null;
  const [, d1, m1, s1, hemNS, d2, m2, s2, hemEW] = m;
  const lat =
    (Number(d1) + Number(m1) / 60 + Number(s1) / 3600) *
    (hemNS.toUpperCase() === "S" ? -1 : 1);
  const lng =
    (Number(d2) + Number(m2) / 60 + Number(s2) / 3600) *
    (hemEW.toUpperCase() === "W" ? -1 : 1);
  return { lat, lng };
}

function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function nameTokens(name: string): Set<string> {
  return new Set(
    slugify(name)
      .split("-")
      .filter((t) => t.length >= 3),
  );
}

function nameTokenOverlap(a: string, b: string): number {
  const ta = nameTokens(a);
  const tb = nameTokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let hits = 0;
  for (const t of ta) if (tb.has(t)) hits += 1;
  return hits / Math.min(ta.size, tb.size);
}

function parseListing(html: string): CrawledPlace[] {
  const $ = load(html);
  const byUrl = new Map<string, CrawledPlace>();

  // Find first table inside the article body and walk its rows.
  const $rows = $("article table tr, .entry-content table tr");
  let currentStezka = "";

  $rows.each((_, tr) => {
    const $tr = $(tr);
    const sectionTitle = $tr.find("h1,h2,h3,h4,h5,h6").first().text().trim();
    if (sectionTitle) {
      currentStezka = sectionTitle;
      return;
    }
    const $cells = $tr.find("> td");
    if ($cells.length < 5) return;

    const name = $cells.eq(0).text().trim();
    if (!name || name === "Název útulny") return;
    const usek = $cells.eq(1).text().trim();
    const etapa = $cells.eq(2).text().trim();
    const km = $cells.eq(3).text().trim();

    const $polohaCell = $cells.eq(4);
    const href = $polohaCell.find("a").first().attr("href") ?? "";
    if (!href.startsWith("https://mapy.cz/")) return;

    const dmsText = $polohaCell.text().trim();
    const coords = parseDms(dmsText);
    if (!coords) {
      console.warn(`[parse] skipping "${name}": cannot parse coords "${dmsText}"`);
      return;
    }

    const occurrence: Occurrence = { stezka: currentStezka, usek, etapa, km };
    const existing = byUrl.get(href);
    if (existing) {
      existing.occurrences.push(occurrence);
      return;
    }
    byUrl.set(href, {
      name,
      lat: coords.lat.toFixed(6),
      lng: coords.lng.toFixed(6),
      sourceUrl: href,
      occurrences: [occurrence],
    });
  });

  return [...byUrl.values()];
}

function buildDescription(p: CrawledPlace): string {
  const lines = ["Útulna na trase Via Czechia.", ""];
  for (const o of p.occurrences) {
    const parts: string[] = [];
    if (o.stezka) parts.push(`**${o.stezka}**`);
    if (o.usek) parts.push(o.usek);
    if (o.etapa) parts.push(`etapa ${o.etapa}`);
    if (o.km) parts.push(`km ${o.km}`);
    lines.push(`- ${parts.join(" · ")}`);
  }
  return lines.join("\n");
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

async function loadBoudyIndex(): Promise<
  Array<{ id: number; name: string; lat: number; lng: number }>
> {
  const rows = await db
    .select({
      id: places.id,
      name: places.name,
      lat: places.lat,
      lng: places.lng,
    })
    .from(places)
    .where(eq(places.source, "boudy.info"));
  return rows.map((r) => ({
    id: Number(r.id),
    name: r.name,
    lat: Number(r.lat),
    lng: Number(r.lng),
  }));
}

async function upsertViaCzechiaPlace(
  p: CrawledPlace,
  categoryId: number,
): Promise<"created" | "updated"> {
  const description = buildDescription(p);

  const existing = await db
    .select({ id: places.id, slug: places.slug })
    .from(places)
    .where(
      and(eq(places.source, "viaczechia"), eq(places.sourceUrl, p.sourceUrl)),
    );

  if (existing[0]) {
    const id = Number(existing[0].id);
    await db
      .update(places)
      .set({
        name: p.name,
        description,
        lat: p.lat,
        lng: p.lng,
        source: "viaczechia",
        sourceUrl: p.sourceUrl,
      })
      .where(eq(places.id, id));
    return "updated";
  }

  // Generate a slug that doesn't collide with an existing place. We never
  // reuse a slug owned by a row with a different (source, source_url).
  const baseSlug = slugify(`utulna-${p.name}`) || "utulna-via-czechia";
  let slug = baseSlug;
  const suffix = p.sourceUrl.split("/").pop() ?? "";
  // Probe up to a handful of variants; collisions are rare (different rows
  // have unique mapy.cz short codes, so the suffix variant is always unique).
  for (let attempt = 0; attempt < 3; attempt++) {
    const clash = await db
      .select({ id: places.id })
      .from(places)
      .where(eq(places.slug, slug));
    if (clash.length === 0) break;
    slug = `${baseSlug}-${suffix}`.slice(0, 160);
    if (attempt === 2) throw new Error(`could not resolve slug for ${p.name}`);
  }

  await db.insert(places).values({
    slug,
    name: p.name,
    description,
    lat: p.lat,
    lng: p.lng,
    hasWc: false,
    isFree: true,
    source: "viaczechia",
    sourceUrl: p.sourceUrl,
  });

  const [row] = await db
    .select({ id: places.id })
    .from(places)
    .where(
      and(eq(places.source, "viaczechia"), eq(places.sourceUrl, p.sourceUrl)),
    );
  const placeId = Number(row!.id);

  await db
    .insert(placeCategories)
    .values({ placeId, categoryId })
    .onDuplicateKeyUpdate({ set: { placeId } });

  return "created";
}

async function main() {
  console.log(`[fetch] ${LISTING_URL}`);
  const html = await rateLimitedFetch(LISTING_URL);
  const candidates = parseListing(html);
  console.log(`[parse] ${candidates.length} unique útulny extracted`);

  if (candidates.length === 0) {
    throw new Error("no útulny extracted — page structure may have changed");
  }

  const utulnaCategoryId = await upsertCategory("utulna", "Útulna");
  const boudyIndex = await loadBoudyIndex();
  console.log(`[dedupe] loaded ${boudyIndex.length} boudy.info rows for comparison`);

  let created = 0;
  let updated = 0;
  let skippedCross = 0;
  const crossWarnings: string[] = [];

  for (const p of candidates) {
    const pLat = Number(p.lat);
    const pLng = Number(p.lng);
    const collision = boudyIndex.find((b) => {
      const dist = haversineMeters({ lat: pLat, lng: pLng }, { lat: b.lat, lng: b.lng });
      if (dist > DUPE_DISTANCE_M) return false;
      const overlap = nameTokenOverlap(p.name, b.name);
      return overlap >= 0.5;
    });
    if (collision) {
      const dist = haversineMeters(
        { lat: pLat, lng: pLng },
        { lat: collision.lat, lng: collision.lng },
      );
      const msg = `[cross-source dupe] viaczechia "${p.name}" (${p.lat},${p.lng}) ~${dist.toFixed(0)}m from boudy.info "${collision.name}" (id=${collision.id}) — skipping, manual merge required`;
      console.warn(msg);
      crossWarnings.push(msg);
      skippedCross += 1;
      continue;
    }

    try {
      const result = await upsertViaCzechiaPlace(p, utulnaCategoryId);
      if (result === "created") created += 1;
      else updated += 1;
    } catch (err) {
      console.error(`[error] upserting "${p.name}": ${(err as Error).message}`);
    }
  }

  const [{ count }] = (await db
    .select({ count: sql<number>`count(*)` })
    .from(places)
    .where(eq(places.source, "viaczechia"))) as Array<{ count: number }>;

  console.log("");
  console.log("=== crawl summary ===");
  console.log(`candidates:           ${candidates.length}`);
  console.log(`created:              ${created}`);
  console.log(`updated:              ${updated}`);
  console.log(`skipped cross-source: ${skippedCross}`);
  console.log(`viaczechia rows in DB: ${count}`);
  if (crossWarnings.length > 0) {
    console.log("");
    console.log("cross-source warnings:");
    for (const w of crossWarnings) console.log(`  ${w}`);
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
