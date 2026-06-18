import { eq, sql } from "drizzle-orm";

import { db } from "../db/client";
import {
  amenities,
  categories,
  locations,
  placeAmenities,
  placeCategories,
  placeImages,
  places,
} from "../db/schema";

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
  {
    slug: "utulna-zdarske-vrchy-devet-skal",
    name: "Útulna Pod Devíti skalami",
    description:
      "Dřevěná útulna pod vrcholem Devíti skal v CHKO Žďárské vrchy. Kamna, prkenné palandy pro 6, studánka v dolíku pod cestou.",
    city: "Sněžné",
    region: "Kraj Vysočina",
    lat: "49.6783",
    lng: "16.0214",
    elevationM: 820,
    sleeps: 6,
    surface: "drevena",
    hasWc: false,
    isFree: true,
    source: "manual",
    sourceUrl: "seed://utulna-devet-skal",
    categorySlugs: ["utulna"],
    amenitySlugs: ["kamna", "voda", "oheniste"],
  },
  {
    slug: "utulna-pod-tisovym-vrchem-vysocina",
    name: "Útulna Pod Tisovým vrchem",
    description:
      "Malá zděná útulna v lese nad obcí Polnička. Otevřená celoročně, hliněná podlaha, suchý záchod 30 m za útulnou.",
    city: "Polnička",
    region: "Kraj Vysočina",
    lat: "49.6042",
    lng: "15.9148",
    elevationM: 640,
    sleeps: 4,
    surface: "hlinena",
    hasWc: true,
    isFree: true,
    source: "manual",
    sourceUrl: "seed://utulna-pod-tisovym-vrchem",
    categorySlugs: ["utulna"],
    amenitySlugs: ["wc", "oheniste"],
  },
  {
    slug: "utulna-brdy-jordan",
    name: "Útulna Pod Jordánem",
    description:
      "Dřevěná útulna v CHKO Brdy poblíž bývalého vojenského prostoru. Stůl, lavice, ohniště venku.",
    city: "Strašice",
    region: "Středočeský kraj",
    lat: "49.7233",
    lng: "13.7861",
    elevationM: 712,
    sleeps: 5,
    surface: "drevena",
    hasWc: false,
    isFree: true,
    source: "manual",
    sourceUrl: "seed://utulna-brdy-jordan",
    categorySlugs: ["utulna"],
    amenitySlugs: ["oheniste", "stul"],
  },
  {
    slug: "nocoviste-zelezne-hory-krizanky",
    name: "Nouzové nocoviště Křižánky",
    description:
      "Otevřený přístřešek u rozcestí žluté a modré značky v Železných horách. Bez vybavení, suchá podlaha.",
    city: "Seč",
    region: "Pardubický kraj",
    lat: "49.8512",
    lng: "15.6603",
    elevationM: 530,
    sleeps: 3,
    surface: "drevena",
    hasWc: false,
    isFree: true,
    source: "manual",
    sourceUrl: "seed://nocoviste-zelezne-hory-krizanky",
    categorySlugs: ["nouzove-nocoviste"],
    amenitySlugs: [],
  },
  {
    slug: "utulna-hostynske-vrchy-troyer",
    name: "Útulna Troyerova chata",
    description:
      "Dřevěná útulna na hřebeni Hostýnských vrchů u modré značky. Kamna, palandy pro 8, voda ve studánce 100 m pod chatou.",
    city: "Rajnochovice",
    region: "Zlínský kraj",
    lat: "49.3789",
    lng: "17.7521",
    elevationM: 715,
    sleeps: 8,
    surface: "drevena",
    hasWc: false,
    isFree: true,
    source: "manual",
    sourceUrl: "seed://utulna-troyer",
    categorySlugs: ["utulna"],
    amenitySlugs: ["kamna", "voda", "oheniste", "stul"],
  },
  {
    slug: "utulna-vsetinske-vrchy-cab",
    name: "Útulna Cáb",
    description:
      "Smíšená útulna pod vrcholem Cábu ve Vsetínských vrších. Kamenné základy, dřevěné stěny, otevřené ohniště.",
    city: "Velké Karlovice",
    region: "Zlínský kraj",
    lat: "49.3621",
    lng: "18.2944",
    elevationM: 841,
    sleeps: 6,
    surface: "mix",
    hasWc: false,
    isFree: true,
    source: "manual",
    sourceUrl: "seed://utulna-cab",
    categorySlugs: ["utulna"],
    amenitySlugs: ["oheniste"],
  },
  {
    slug: "utulna-lysa-hora-beskydy",
    name: "Útulna pod Lysou horou",
    description:
      "Nízká dřevěná útulna na sedle pod Lysou horou. Vhodná pro nouzové přespání 4 osob, kamna, suchá podestýlka.",
    city: "Ostravice",
    region: "Moravskoslezský kraj",
    lat: "49.5468",
    lng: "18.4472",
    elevationM: 1024,
    sleeps: 4,
    surface: "drevena",
    hasWc: false,
    isFree: true,
    source: "manual",
    sourceUrl: "seed://utulna-pod-lysou",
    categorySlugs: ["utulna"],
    amenitySlugs: ["kamna", "oheniste"],
  },
  {
    slug: "utulna-sumava-hrbenovka",
    name: "Útulna Hřbenovka",
    description:
      "Dřevěná útulna v hřebenovém lese šumavské části Královského hvozdu. Palandy pro 5, kamna na dřevo, lavice, stůl.",
    city: "Hartmanice",
    region: "Plzeňský kraj",
    lat: "49.1573",
    lng: "13.4528",
    elevationM: 1085,
    sleeps: 5,
    surface: "drevena",
    hasWc: false,
    isFree: true,
    source: "manual",
    sourceUrl: "seed://utulna-hrbenovka",
    categorySlugs: ["utulna"],
    amenitySlugs: ["kamna", "stul", "oheniste"],
  },
  {
    slug: "utulna-novohradky-malovicky",
    name: "Útulna U Malovického potoka",
    description:
      "Malá kamenná útulna nad údolím Malovického potoka v Novohradských horách. Hliněná podlaha, otevřené ohniště.",
    city: "Benešov nad Černou",
    region: "Jihočeský kraj",
    lat: "48.7355",
    lng: "14.6122",
    elevationM: 740,
    sleeps: 4,
    surface: "kamenna",
    hasWc: false,
    isFree: true,
    source: "manual",
    sourceUrl: "seed://utulna-malovicky",
    categorySlugs: ["utulna"],
    amenitySlugs: ["oheniste", "voda"],
  },
  {
    slug: "nocoviste-orlicke-podhuri-zampach",
    name: "Nouzové nocoviště Žampach",
    description:
      "Otevřený dřevěný altán nad obcí Žampach v Orlickém podhůří. Stůl, dvě lavice, ohniště venku.",
    city: "Žampach",
    region: "Pardubický kraj",
    lat: "50.0294",
    lng: "16.5481",
    elevationM: 410,
    sleeps: 4,
    surface: "drevena",
    hasWc: false,
    isFree: true,
    source: "manual",
    sourceUrl: "seed://nocoviste-zampach",
    categorySlugs: ["nouzove-nocoviste"],
    amenitySlugs: ["oheniste", "stul"],
  },
];

function imageSeedsFor(slug: string, count: number): Array<{ url: string; alt: string }> {
  return Array.from({ length: count }, (_, i) => ({
    url: `https://picsum.photos/seed/${slug}-${i + 1}/1200/800`,
    alt: `${slug} – placeholder photo ${i + 1}`,
  }));
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

async function syncPlaceImages(placeId: number, slug: string): Promise<number> {
  const existing = await db
    .select({ id: placeImages.id })
    .from(placeImages)
    .where(eq(placeImages.placeId, placeId));
  if (existing.length > 0) return 0;
  const photos = imageSeedsFor(slug, 2);
  for (const [i, photo] of photos.entries()) {
    await db.insert(placeImages).values({
      placeId,
      url: photo.url,
      alt: photo.alt,
      sortOrder: i,
    });
  }
  return photos.length;
}

export async function runSeed() {
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
  let photosAdded = 0;
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
    photosAdded += await syncPlaceImages(result.id, seed.slug);
  }

  const [{ count }] = (await db
    .select({ count: sql<number>`count(*)` })
    .from(places)) as Array<{ count: number }>;

  console.log(
    `seed: ${created} created, ${updated} updated, ${PLACE_SEED.length} total seeded, ${photosAdded} photos inserted`,
  );
  console.log(`places in DB after seed: ${count}`);
}

