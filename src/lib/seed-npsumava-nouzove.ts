/**
 * Seed 7 oficiálních nouzových nocovišť NP Šumava (NOC-88).
 *
 * Source: https://www.npsumava.cz/navstivte-sumavu/nouzova-nocoviste/
 *
 * Library version, used by both /api/setup/seed-npsumava-nouzove and the
 * local CLI seed (src/lib/db-seed.ts). Idempotent: re-running upserts on
 * (source, source_url) unique key — see the unique index on `places`.
 */
import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { categories, placeCategories, places } from "@/db/schema";

const SOURCE_LIST_URL =
  "https://www.npsumava.cz/navstivte-sumavu/nouzova-nocoviste/";
const CATEGORY_SLUG = "nouzove-nocoviste";
const CATEGORY_NAME = "Nouzové nocoviště";

type NocovistuSeed = {
  slug: string;
  name: string;
  lat: string;
  lng: string;
  mapyId: number;
  /** Short, place-specific intro that precedes the shared rules block. */
  intro: string;
};

const NOCOVISTE_SEED: ReadonlyArray<NocovistuSeed> = [
  {
    slug: "nouzove-nocoviste-polednik",
    name: "Nouzové nocoviště Poledník",
    lat: "49.064428",
    lng: "13.395315",
    mapyId: 1915425,
    intro:
      "V hřebenovém lese Železnorudska poblíž rozhledny Poledník (1315 m n. m.), na trase červené značky mezi Prášily a Modravou.",
  },
  {
    slug: "nouzove-nocoviste-hurka-u-prasil",
    name: "Nouzové nocoviště Hůrka u Prášil",
    lat: "49.126931",
    lng: "13.328472",
    mapyId: 1915424,
    intro:
      "Na okraji zaniklé osady Hůrka u Prášil, nedaleko Prášilského jezera. Snadno dostupné od parkoviště v Prášilech.",
  },
  {
    slug: "nouzove-nocoviste-modrava",
    name: "Nouzové nocoviště Modrava",
    lat: "49.024028",
    lng: "13.489246",
    mapyId: 1915426,
    intro:
      "Nad obcí Modrava, na trase do nitra šumavských plání. Vstupní bod do nejodlehlejších částí parku.",
  },
  {
    slug: "nouzove-nocoviste-bucina",
    name: "Nouzové nocoviště Bučina",
    lat: "48.971281",
    lng: "13.597403",
    mapyId: 1915427,
    intro:
      "Bývalá osada Bučina (asi 1160 m n. m.) na hřebeni nad Kvildou. Nejvýše položené nocoviště v NP Šumava.",
  },
  {
    slug: "nouzove-nocoviste-strazny",
    name: "Nouzové nocoviště Strážný",
    lat: "48.900650",
    lng: "13.711369",
    mapyId: 1915428,
    intro:
      "V lesích nad obcí Strážný, poblíž hraničního přechodu. Vhodný zastávkový bod pro pěší přechod centrální Šumavy.",
  },
  {
    slug: "nouzove-nocoviste-nove-udoli",
    name: "Nouzové nocoviště Nové Údolí",
    lat: "48.829599",
    lng: "13.800790",
    mapyId: 1915429,
    intro:
      "U bývalé osady Nové Údolí na konci železniční trati ze Stožce, na trase Schwarzenberského kanálu.",
  },
  {
    slug: "nouzove-nocoviste-pod-plesnym-jezerem",
    name: "Nouzové nocoviště Pod Plešným jezerem",
    lat: "48.779486",
    lng: "13.884771",
    mapyId: 1915430,
    intro:
      "V lese pod Plešným jezerem, nejvýše položeným ledovcovým jezerem na Šumavě. Spodní zastávka pro pěší výstup k jezeru a na Plechý.",
  },
];

const RULES_MARKDOWN = `**Pravidla pobytu** (NP Šumava):

- Pouze pro pěší turisty, ne pro auta, motorky ani karavany.
- Maximálně **1 noc** na jednom místě.
- **Otevřený oheň je zakázán** — vařte pouze na uzavřeném vařiči.
- Bez stálé infrastruktury (chata, voda, WC, svoz odpadu) — vše s sebou, vše odnést.
- Pohyb mimo značené cesty je v jádrových zónách parku zakázán; nocoviště přístup k cestám neumožňuje.

Více informací a aktuální stav: [npsumava.cz – nouzová nocoviště](${SOURCE_LIST_URL}).`;

function buildDescription(p: NocovistuSeed): string {
  return [
    `Oficiální nouzové nocoviště Národního parku Šumava.`,
    ``,
    p.intro,
    ``,
    RULES_MARKDOWN,
    ``,
    `Poloha na [mapy.com](${mapyLinkFor(p)}).`,
  ].join("\n");
}

function sourceUrlFor(p: NocovistuSeed): string {
  // Anchor disambiguates per-row uniqueness (UNIQUE KEY on (source, source_url))
  // while still resolving to the canonical npsumava listing page in browsers
  // that ignore unknown anchors.
  const anchor = p.slug.replace(/^nouzove-nocoviste-/, "");
  return `${SOURCE_LIST_URL}#${anchor}`;
}

function mapyLinkFor(p: NocovistuSeed): string {
  return `https://mapy.com/turisticka?source=base&id=${p.mapyId}`;
}

async function ensureSourceEnum(): Promise<void> {
  await db.execute(
    sql.raw(
      "ALTER TABLE `places` MODIFY COLUMN `source` " +
        "ENUM('boudy.info','viaczechia','npsumava','manual') " +
        "NOT NULL DEFAULT 'manual'",
    ),
  );
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

async function upsertNocoviste(
  p: NocovistuSeed,
  categoryId: number,
): Promise<"created" | "updated"> {
  const sourceUrl = sourceUrlFor(p);
  const description = buildDescription(p);

  // Prefer match on the unique (source, source_url) index, but fall back to
  // slug so a re-seed after the sourceUrl scheme changes upgrades old rows in
  // place instead of colliding on slug.
  const existing = await db
    .select({ id: places.id })
    .from(places)
    .where(and(eq(places.source, "npsumava"), eq(places.sourceUrl, sourceUrl)));
  const matched =
    existing[0] ??
    (
      await db
        .select({ id: places.id })
        .from(places)
        .where(eq(places.slug, p.slug))
    )[0];

  let placeId: number;
  let outcome: "created" | "updated";
  if (matched) {
    placeId = Number(matched.id);
    await db
      .update(places)
      .set({
        slug: p.slug,
        name: p.name,
        description,
        lat: p.lat,
        lng: p.lng,
        hasWc: false,
        isFree: true,
        source: "npsumava",
        sourceUrl,
      })
      .where(eq(places.id, placeId));
    outcome = "updated";
  } else {
    await db.insert(places).values({
      slug: p.slug,
      name: p.name,
      description,
      lat: p.lat,
      lng: p.lng,
      hasWc: false,
      isFree: true,
      source: "npsumava",
      sourceUrl,
    });
    const [row] = await db
      .select({ id: places.id })
      .from(places)
      .where(
        and(eq(places.source, "npsumava"), eq(places.sourceUrl, sourceUrl)),
      );
    placeId = Number(row!.id);
    outcome = "created";
  }

  await db
    .insert(placeCategories)
    .values({ placeId, categoryId })
    .onDuplicateKeyUpdate({ set: { placeId } });

  return outcome;
}

export type NpsumavaSeedSummary = {
  sourceListUrl: string;
  created: number;
  updated: number;
  errors: string[];
  npsumavaRowsInDb: number;
};

export async function countNpsumavaPlaces(): Promise<number> {
  const [{ count }] = (await db
    .select({ count: sql<number>`count(*)` })
    .from(places)
    .where(eq(places.source, "npsumava"))) as Array<{ count: number }>;
  return Number(count);
}

export async function runNpsumavaNouzoveSeed(): Promise<NpsumavaSeedSummary> {
  await ensureSourceEnum();
  const categoryId = await upsertCategory(CATEGORY_SLUG, CATEGORY_NAME);

  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const p of NOCOVISTE_SEED) {
    try {
      const result = await upsertNocoviste(p, categoryId);
      if (result === "created") created += 1;
      else updated += 1;
    } catch (err) {
      errors.push(`"${p.name}": ${(err as Error).message}`);
    }
  }

  const npsumavaRowsInDb = await countNpsumavaPlaces();

  return {
    sourceListUrl: SOURCE_LIST_URL,
    created,
    updated,
    errors,
    npsumavaRowsInDb,
  };
}
