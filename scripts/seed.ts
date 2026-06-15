import { eq, sql } from "drizzle-orm";

import { db, sqlClient } from "../src/db/client";
import {
  amenities,
  categories,
  locations,
  placeAmenities,
  placeCategories,
  places,
} from "../src/db/schema";

const CATEGORY_SEED = [
  { slug: "utulna", name: "Útulna" },
  { slug: "nouzove-nocoviste", name: "Nouzové nocoviště" },
] as const;

const AMENITY_SEED = [
  { slug: "wc", label: "WC" },
  { slug: "voda", label: "Pitná voda" },
  { slug: "oheniste", label: "Ohniště" },
  { slug: "stul", label: "Stůl / lavice" },
  { slug: "kamna", label: "Kamna" },
] as const;

type SurfaceLiteral = (typeof places.surface.enumValues)[number];
type SourceLiteral = (typeof places.source.enumValues)[number];

type PlaceSeed = {
  slug: string;
  name: string;
  description: string;
  city: string;
  region: string;
  lat: string;
  lng: string;
  elevationM: number;
  sleeps: number;
  surface: SurfaceLiteral;
  hasWc: boolean;
  isFree: boolean;
  source: SourceLiteral;
  sourceUrl: string;
  categorySlugs: ReadonlyArray<(typeof CATEGORY_SEED)[number]["slug"]>;
  amenitySlugs: ReadonlyArray<(typeof AMENITY_SEED)[number]["slug"]>;
};

const PLACE_SEED: ReadonlyArray<PlaceSeed> = [
  {
    slug: "utulna-pod-smrkem-jizerske-hory",
    name: "Útulna Pod Smrkem",
    description:
      "Dřevěná útulna v Jizerských horách kousek pod vrcholem Smrku. Otevřená celoročně, postele bez matrací, kamna na dřevo.",
    city: "Lázně Libverda",
    region: "Liberecký kraj",
    lat: "50.8625",
    lng: "15.2347",
    elevationM: 1080,
    sleeps: 6,
    surface: "drevena",
    hasWc: false,
    isFree: true,
    source: "manual",
    sourceUrl: "seed://utulna-pod-smrkem",
    categorySlugs: ["utulna"],
    amenitySlugs: ["kamna", "oheniste"],
  },
  {
    slug: "utulna-na-pomezi-orlicke-hory",
    name: "Útulna Na Pomezí",
    description:
      "Kamenná turistická útulna na hřebenu Orlických hor poblíž polské hranice. Volný přístup, prkenné palandy.",
    city: "Bartošovice v Orlických horách",
    region: "Královéhradecký kraj",
    lat: "50.2153",
    lng: "16.4912",
    elevationM: 950,
    sleeps: 8,
    surface: "kamenna",
    hasWc: false,
    isFree: true,
    source: "manual",
    sourceUrl: "seed://utulna-na-pomezi",
    categorySlugs: ["utulna"],
    amenitySlugs: ["oheniste"],
  },
  {
    slug: "utulna-pod-kraliky-jeseniky",
    name: "Útulna Pod Králíky",
    description:
      "Malá dřevěná útulna v Hrubém Jeseníku. Hliněná podlaha, kamna, suchá záchodová bouda venku.",
    city: "Bělá pod Pradědem",
    region: "Olomoucký kraj",
    lat: "50.1289",
    lng: "17.2461",
    elevationM: 1240,
    sleeps: 4,
    surface: "hlinena",
    hasWc: true,
    isFree: true,
    source: "manual",
    sourceUrl: "seed://utulna-pod-kraliky",
    categorySlugs: ["utulna"],
    amenitySlugs: ["wc", "kamna", "stul"],
  },
  {
    slug: "utulna-cerne-jezero-sumava",
    name: "Útulna U Černého jezera",
    description:
      "Pohotovostní útulna spravovaná KČT, kamenné základy, dřevěná střecha. Vhodná pro krizové nouzové přespání.",
    city: "Železná Ruda",
    region: "Plzeňský kraj",
    lat: "49.1781",
    lng: "13.1842",
    elevationM: 1010,
    sleeps: 5,
    surface: "kamenna",
    hasWc: false,
    isFree: true,
    source: "manual",
    sourceUrl: "seed://utulna-cerne-jezero",
    categorySlugs: ["utulna"],
    amenitySlugs: ["oheniste"],
  },
  {
    slug: "utulna-vysoka-bouda-krkonose",
    name: "Útulna Vysoká bouda",
    description:
      "Dřevěná útulna nedaleko Luční boudy v Krkonoších. Travnatá podlaha, otevřené ohniště venku.",
    city: "Pec pod Sněžkou",
    region: "Královéhradecký kraj",
    lat: "50.7378",
    lng: "15.6924",
    elevationM: 1410,
    sleeps: 10,
    surface: "trava",
    hasWc: false,
    isFree: true,
    source: "manual",
    sourceUrl: "seed://utulna-vysoka-bouda",
    categorySlugs: ["utulna"],
    amenitySlugs: ["oheniste", "stul"],
  },
  {
    slug: "nocoviste-pod-luzickym-vrchem",
    name: "Nouzové nocoviště pod Lužickým vrchem",
    description:
      "Otevřený přístřešek na rozcestí. Bez vybavení, slouží pro krátké přečkání nepřízně počasí.",
    city: "Krompach",
    region: "Liberecký kraj",
    lat: "50.8607",
    lng: "14.6911",
    elevationM: 540,
    sleeps: 3,
    surface: "drevena",
    hasWc: false,
    isFree: true,
    source: "manual",
    sourceUrl: "seed://nocoviste-pod-luzickym-vrchem",
    categorySlugs: ["nouzove-nocoviste"],
    amenitySlugs: [],
  },
  {
    slug: "nocoviste-stoh-rokytnice",
    name: "Nouzové nocoviště Stoh",
    description:
      "Přístřešek u turistické cesty pod vrcholem Stoh. Lavice, stůl, ohniště. Bez stěn — pouze střecha proti dešti.",
    city: "Rokytnice nad Jizerou",
    region: "Liberecký kraj",
    lat: "50.7531",
    lng: "15.5012",
    elevationM: 1320,
    sleeps: 4,
    surface: "drevena",
    hasWc: false,
    isFree: true,
    source: "manual",
    sourceUrl: "seed://nocoviste-stoh",
    categorySlugs: ["nouzove-nocoviste"],
    amenitySlugs: ["oheniste", "stul"],
  },
  {
    slug: "utulna-vyhlidka-beskydy",
    name: "Útulna Vyhlídka",
    description:
      "Smíšená konstrukce – kamenné základy, dřevěné stěny. Spravuje KČT Frenštát.",
    city: "Frenštát pod Radhoštěm",
    region: "Moravskoslezský kraj",
    lat: "49.5421",
    lng: "18.2087",
    elevationM: 870,
    sleeps: 6,
    surface: "mix",
    hasWc: false,
    isFree: true,
    source: "manual",
    sourceUrl: "seed://utulna-vyhlidka-beskydy",
    categorySlugs: ["utulna"],
    amenitySlugs: ["oheniste", "kamna"],
  },
  {
    slug: "utulna-pod-vejlapem-novohradske-hory",
    name: "Útulna Pod Vejlapem",
    description:
      "Tichý kout Novohradských hor, dřevěná útulna mezi smrky. Studánka 200 m po cestě.",
    city: "Pohorská Ves",
    region: "Jihočeský kraj",
    lat: "48.7012",
    lng: "14.7458",
    elevationM: 920,
    sleeps: 5,
    surface: "drevena",
    hasWc: false,
    isFree: true,
    source: "manual",
    sourceUrl: "seed://utulna-pod-vejlapem",
    categorySlugs: ["utulna"],
    amenitySlugs: ["voda", "oheniste"],
  },
  {
    slug: "nocoviste-pohorelice-krusne-hory",
    name: "Nouzové nocoviště Pohořelice",
    description:
      "Travnaté nocoviště u rozcestí cyklotrasy 23. Lavička, ohniště, mapa terénu.",
    city: "Klínovec",
    region: "Karlovarský kraj",
    lat: "50.3982",
    lng: "12.9648",
    elevationM: 1120,
    sleeps: 4,
    surface: "trava",
    hasWc: false,
    isFree: true,
    source: "manual",
    sourceUrl: "seed://nocoviste-pohorelice",
    categorySlugs: ["nouzove-nocoviste"],
    amenitySlugs: ["oheniste"],
  },
];

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

async function upsertAmenity(slug: string, label: string): Promise<number> {
  const existing = await db
    .select({ id: amenities.id })
    .from(amenities)
    .where(eq(amenities.slug, slug));
  if (existing[0]) return Number(existing[0].id);
  await db.insert(amenities).values({ slug, label });
  const [row] = await db
    .select({ id: amenities.id })
    .from(amenities)
    .where(eq(amenities.slug, slug));
  return Number(row!.id);
}

async function upsertLocation(city: string, region: string): Promise<number> {
  const existing = await db
    .select({ id: locations.id })
    .from(locations)
    .where(eq(locations.city, city));
  if (existing[0]) return Number(existing[0].id);
  await db.insert(locations).values({ city, region, country: "CZ" });
  const [row] = await db
    .select({ id: locations.id })
    .from(locations)
    .where(eq(locations.city, city));
  return Number(row!.id);
}

async function upsertPlace(
  seed: PlaceSeed,
  locationId: number,
  categoryIdBySlug: Map<string, number>,
  amenityIdBySlug: Map<string, number>,
): Promise<{ id: number; created: boolean }> {
  const existing = await db
    .select({ id: places.id })
    .from(places)
    .where(eq(places.slug, seed.slug));

  if (existing[0]) {
    const id = Number(existing[0].id);
    await db
      .update(places)
      .set({
        name: seed.name,
        description: seed.description,
        locationId,
        lat: seed.lat,
        lng: seed.lng,
        elevationM: seed.elevationM,
        sleeps: seed.sleeps,
        surface: seed.surface,
        hasWc: seed.hasWc,
        isFree: seed.isFree,
        source: seed.source,
        sourceUrl: seed.sourceUrl,
      })
      .where(eq(places.id, id));
    return { id, created: false };
  }

  await db.insert(places).values({
    slug: seed.slug,
    name: seed.name,
    description: seed.description,
    locationId,
    lat: seed.lat,
    lng: seed.lng,
    elevationM: seed.elevationM,
    sleeps: seed.sleeps,
    surface: seed.surface,
    hasWc: seed.hasWc,
    isFree: seed.isFree,
    source: seed.source,
    sourceUrl: seed.sourceUrl,
  });
  const [row] = await db
    .select({ id: places.id })
    .from(places)
    .where(eq(places.slug, seed.slug));
  const id = Number(row!.id);

  for (const slug of seed.categorySlugs) {
    const categoryId = categoryIdBySlug.get(slug);
    if (!categoryId) continue;
    await db.insert(placeCategories).values({ placeId: id, categoryId });
  }
  for (const slug of seed.amenitySlugs) {
    const amenityId = amenityIdBySlug.get(slug);
    if (!amenityId) continue;
    await db.insert(placeAmenities).values({ placeId: id, amenityId });
  }
  return { id, created: true };
}

async function main() {
  const categoryIdBySlug = new Map<string, number>();
  for (const { slug, name } of CATEGORY_SEED) {
    const id = await upsertCategory(slug, name);
    categoryIdBySlug.set(slug, id);
  }

  const amenityIdBySlug = new Map<string, number>();
  for (const { slug, label } of AMENITY_SEED) {
    const id = await upsertAmenity(slug, label);
    amenityIdBySlug.set(slug, id);
  }

  let created = 0;
  let updated = 0;
  for (const seed of PLACE_SEED) {
    const locationId = await upsertLocation(seed.city, seed.region);
    const result = await upsertPlace(
      seed,
      locationId,
      categoryIdBySlug,
      amenityIdBySlug,
    );
    if (result.created) created += 1;
    else updated += 1;
  }

  const [{ count }] = (await db
    .select({ count: sql<number>`count(*)` })
    .from(places)) as Array<{ count: number }>;

  console.log(
    `seed: ${created} created, ${updated} updated, ${PLACE_SEED.length} total seeded`,
  );
  console.log(`places in DB after seed: ${count}`);
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
