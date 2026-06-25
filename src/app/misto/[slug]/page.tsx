import { asc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";

import { CategoryIcon } from "@/components/CategoryIcon";
import { MiniMap } from "@/components/MiniMap";
import { SaveToggle } from "@/components/SaveToggle";
import { ReportForm } from "./_components/ReportForm";
import { db } from "@/db/client";
import {
  amenities,
  categories,
  locations,
  placeAmenities,
  placeCategories,
  placeImages,
  places,
} from "@/db/schema";
import { slugifyRegion } from "@/lib/regions";
import { getSiteUrl } from "@/lib/site-url";

const CATEGORY_LABEL: Record<string, string> = {
  utulna: "Útulna",
  "nouzove-nocoviste": "Nouzové nocoviště",
};

const SURFACE_LABEL: Record<string, string> = {
  kamenna: "Kamenná podlaha",
  drevena: "Dřevěná podlaha",
  hlinena: "Hliněná podlaha",
  trava: "Travnatý povrch",
  mix: "Smíšený povrch",
};

const SOURCE_LABEL: Record<string, string> = {
  "boudy.info": "boudy.info",
  viaczechia: "viaczechia.cz",
  npsumava: "npsumava.cz",
  manual: "Vlastní záznam",
};

type DetailData = {
  place: typeof places.$inferSelect;
  location: typeof locations.$inferSelect | null;
  categorySlugs: string[];
  amenityLabels: string[];
  images: (typeof placeImages.$inferSelect)[];
};

async function loadPlace(slug: string): Promise<DetailData | null> {
  const placeRows = await db
    .select()
    .from(places)
    .where(eq(places.slug, slug))
    .limit(1);
  const place = placeRows[0];
  if (!place) return null;

  const placeId = Number(place.id);

  const [locationRows, categoryRows, amenityRows, imageRows] = await Promise.all([
    place.locationId
      ? db
          .select()
          .from(locations)
          .where(eq(locations.id, Number(place.locationId)))
          .limit(1)
      : Promise.resolve([] as (typeof locations.$inferSelect)[]),
    db
      .select({ slug: categories.slug })
      .from(placeCategories)
      .innerJoin(categories, eq(placeCategories.categoryId, categories.id))
      .where(eq(placeCategories.placeId, placeId)),
    db
      .select({ label: amenities.label })
      .from(placeAmenities)
      .innerJoin(amenities, eq(placeAmenities.amenityId, amenities.id))
      .where(eq(placeAmenities.placeId, placeId)),
    db
      .select()
      .from(placeImages)
      .where(eq(placeImages.placeId, placeId))
      .orderBy(asc(placeImages.sortOrder)),
  ]);

  return {
    place,
    location: locationRows[0] ?? null,
    categorySlugs: categoryRows.map((r) => r.slug),
    amenityLabels: amenityRows.map((r) => r.label),
    images: imageRows,
  };
}

function truncate(text: string, max = 200): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "…";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadPlace(slug);
  if (!data) return { title: "Místo nenalezeno"  };

  const { place, location } = data;
  const subtitle = [location?.city, location?.region]
    .filter(Boolean)
    .join(", ");
  const description = place.description
    ? truncate(place.description.replace(/\s+/g, " "))
    : `Místo k přespání: ${place.name}${subtitle ? ` (${subtitle})` : ""}.`;

  return {
    title: place.name,
    description,
    alternates: { canonical: `/misto/${place.slug}` },
    openGraph: {
      title: place.name,
      description,
      type: "article",
    },
  };
}

function buildPlaceJsonLd({
  place,
  location,
  categorySlugs,
  amenityLabels,
  images,
}: DetailData): Record<string, unknown> {
  const baseUrl = getSiteUrl();
  const lat = Number(place.lat);
  const lng = Number(place.lng);
  const isEmergency = categorySlugs.includes("nouzove-nocoviste");
  const types = isEmergency
    ? ["Campground", "EmergencyService"]
    : ["Campground", "LodgingBusiness"];

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": types.length === 1 ? types[0] : types,
    name: place.name,
    url: `${baseUrl}/misto/${place.slug}`,
    description: place.description
      ? place.description.replace(/\s+/g, " ").slice(0, 600)
      : undefined,
    geo: {
      "@type": "GeoCoordinates",
      latitude: lat,
      longitude: lng,
    },
    address: {
      "@type": "PostalAddress",
      addressCountry: location?.country ?? "CZ",
      addressLocality: location?.city ?? undefined,
      addressRegion: location?.region ?? undefined,
    },
    isAccessibleForFree: Boolean(place.isFree),
    publicAccess: true,
    amenityFeature: amenityLabels.map((label) => ({
      "@type": "LocationFeatureSpecification",
      name: label,
      value: true,
    })),
    image: images.map((img) => img.url),
  };

  if (place.elevationM != null) {
    (data.geo as Record<string, unknown>).elevation = `${place.elevationM} m`;
  }
  if (place.sleeps != null) {
    data.maximumAttendeeCapacity = place.sleeps;
  }
  if (location?.region) {
    data.areaServed = {
      "@type": "AdministrativeArea",
      name: location.region,
      url: `${baseUrl}/oblast/${slugifyRegion(location.region)}`,
    };
  }

  return Object.fromEntries(
    Object.entries(data).filter(([, v]) => {
      if (v === undefined) return false;
      if (Array.isArray(v) && v.length === 0) return false;
      return true;
    }),
  );
}

function HeroPlaceholder({ name, category }: { name: string; category: string | null }) {
  const palette =
    category === "nouzove-nocoviste"
      ? "from-amber-700 to-amber-900"
      : "from-emerald-700 to-emerald-900";
  return (
    <div
      aria-label={name}
      className={`flex h-64 w-full items-center justify-center bg-gradient-to-br text-white/90 sm:h-80 ${palette}`}
    >
      <CategoryIcon category={category} size={96} mono />
    </div>
  );
}

function Chip({
  children,
  tone = "zinc",
}: {
  children: React.ReactNode;
  tone?: "emerald" | "sky" | "zinc" | "amber";
}) {
  const styles: Record<string, string> = {
    emerald: "bg-emerald-100 text-emerald-800",
    sky: "bg-sky-100 text-sky-800",
    zinc: "bg-zinc-100 text-zinc-700",
    amber: "bg-amber-100 text-amber-800",
  };
  return (
    <span
      className={`rounded-full px-3 py-1 text-sm font-medium ${styles[tone]}`}
    >
      {children}
    </span>
  );
}

export default async function MistoDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const data = await loadPlace(slug);
  if (!data) notFound();

  const reportSent = sp.reportSent === "1";
  const reportErrorRaw = Array.isArray(sp.reportError)
    ? sp.reportError[0]
    : sp.reportError;
  const reportStatus: "idle" | "sent" | "error" = reportSent
    ? "sent"
    : reportErrorRaw
      ? "error"
      : "idle";

  const { place, location, categorySlugs, amenityLabels, images } = data;
  const heroImage = images[0];
  const lat = Number(place.lat);
  const lng = Number(place.lng);
  const primaryCategory = categorySlugs[0] ?? null;
  const subtitle = [location?.city, location?.region].filter(Boolean).join(", ");
  const mapyUrl = `https://mapy.cz/?source=coor&id=${lng},${lat}`;
  const sourceLabel = SOURCE_LABEL[place.source] ?? place.source;
  const regionSlug = location?.region ? slugifyRegion(location.region) : null;
  const jsonLd = buildPlaceJsonLd(data);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav className="mb-6 text-sm">
        <Link
          href="/objevit"
          className="text-emerald-700 hover:text-emerald-800 hover:underline"
        >
          ← Zpět na seznam
        </Link>
        {regionSlug && location?.region && (
          <>
            <span className="mx-2 text-zinc-400" aria-hidden>·</span>
            <Link
              href={`/oblast/${regionSlug}`}
              className="text-emerald-700 hover:text-emerald-800 hover:underline"
            >
              {location.region}
            </Link>
          </>
        )}
      </nav>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        {heroImage ? (
          <img
            src={heroImage.url}
            alt={heroImage.alt ?? place.name}
            className="h-64 w-full object-cover sm:h-80"
          />
        ) : (
          <HeroPlaceholder name={place.name} category={primaryCategory} />
        )}

        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 sm:text-4xl">
                {place.name}
              </h1>
              {subtitle && (
                <p className="mt-2 text-lg text-zinc-600">{subtitle}</p>
              )}
            </div>
            <SaveToggle slug={place.slug} variant="detail" />
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {categorySlugs.map((slug) => (
              <Chip key={slug} tone="emerald">
                {CATEGORY_LABEL[slug] ?? slug}
              </Chip>
            ))}
            {place.surface && (
              <Chip>{SURFACE_LABEL[place.surface] ?? place.surface}</Chip>
            )}
            {place.hasWc ? (
              <Chip tone="sky">WC ✓</Chip>
            ) : (
              <Chip>Bez WC</Chip>
            )}
            {typeof place.sleeps === "number" && (
              <Chip>{place.sleeps} míst k přespání</Chip>
            )}
            {typeof place.elevationM === "number" && (
              <Chip>{place.elevationM} m n. m.</Chip>
            )}
          </div>

          {place.description && (
            <div className="mt-8 space-y-3 leading-relaxed text-zinc-700 [&_a]:font-medium [&_a]:text-emerald-700 [&_a]:underline [&_strong]:font-semibold [&_strong]:text-zinc-900">
              <ReactMarkdown>{place.description}</ReactMarkdown>
            </div>
          )}

          {amenityLabels.length > 0 && (
            <section className="mt-8">
              <h2 className="text-lg font-semibold text-zinc-900">Vybavení</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {amenityLabels.map((label) => (
                  <li
                    key={label}
                    className="rounded bg-zinc-100 px-3 py-1 text-sm text-zinc-700"
                  >
                    {label}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-8">
            <h2 className="text-lg font-semibold text-zinc-900">Kde to je</h2>
            <div className="mt-3 h-72 overflow-hidden rounded-lg border border-zinc-200">
              <MiniMap
                center={[lat, lng]}
                zoom={13}
                markers={[
                  {
                    id: Number(place.id),
                    lat,
                    lng,
                    label: place.name,
                  },
                ]}
              />
            </div>
            <p className="mt-3 text-sm text-zinc-600">
              GPS: {lat.toFixed(5)}, {lng.toFixed(5)}
              {" · "}
              <a
                href={mapyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
              >
                Jak se dostat (mapy.cz) →
              </a>
            </p>
          </section>

          <ReportForm
            placeId={Number(place.id)}
            slug={place.slug}
            status={reportStatus}
            errorMessage={reportErrorRaw ?? null}
          />

          <footer className="mt-10 border-t border-zinc-200 pt-4 text-sm text-zinc-500">
            Zdroj:{" "}
            {place.sourceUrl && place.source !== "manual" ? (
              <a
                href={place.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-zinc-700 hover:underline"
              >
                {sourceLabel}
              </a>
            ) : (
              <span>{sourceLabel}</span>
            )}
          </footer>
        </div>
      </div>
    </main>
  );
}
