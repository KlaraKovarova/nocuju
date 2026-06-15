import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DetailMiniMapLoader } from "@/components/detail-mini-map-loader";
import {
  SURFACE_LABEL,
  getPlaceBySlug,
  placeCoords,
  type SurfaceLiteral,
} from "@/lib/places";
import { tryDb } from "@/lib/safe-db";

export const revalidate = 0;
export const runtime = "nodejs";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata(
  { params }: PageProps,
): Promise<Metadata> {
  const { slug } = await params;
  const result = await tryDb(() => getPlaceBySlug(slug));
  if (!result.ok || !result.value) {
    return { title: "Místo nenalezeno" };
  }
  const place = result.value;
  return {
    title: place.name,
    description: place.description?.slice(0, 160) ?? undefined,
    openGraph: {
      title: place.name,
      description: place.description?.slice(0, 200) ?? undefined,
      locale: "cs_CZ",
      type: "article",
    },
  };
}

export default async function PlaceDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const result = await tryDb(() => getPlaceBySlug(slug));
  if (!result.ok) {
    return <DbErrorState />;
  }
  const place = result.value;
  if (!place) {
    notFound();
  }

  const coords = placeCoords(place);
  const mapyHref = coords
    ? `https://mapy.cz/turisticka?source=coor&id=${coords.lng},${coords.lat}&x=${coords.lng}&y=${coords.lat}&z=16`
    : null;

  const primaryCategory = place.categories[0];

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <nav className="text-sm text-[color:var(--muted)]">
        <Link
          href="/objevit"
          className="hover:text-[color:var(--foreground)]"
        >
          ← Zpět na katalog
        </Link>
      </nav>

      <header className="mt-6">
        {primaryCategory ? (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--accent)]">
            {primaryCategory.name}
          </p>
        ) : null}
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">{place.name}</h1>
        <p className="mt-2 text-[color:var(--muted)]">
          {place.city ?? "Neznámá lokalita"}
          {place.region ? ` · ${place.region}` : ""}
        </p>
      </header>

      <div
        className="mt-8 h-64 overflow-hidden rounded-2xl bg-gradient-to-br from-[#5d8b56] via-[#9eb188] to-[#dfe6c3] shadow-sm"
        aria-hidden={!place.image}
      >
        {place.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={place.image.url}
            alt={place.image.alt ?? place.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="relative h-full w-full">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.25),transparent_55%)]" />
          </div>
        )}
      </div>

      <section className="mt-8 flex flex-wrap gap-2">
        {place.categories.map((c) => (
          <Chip key={`cat-${c.id}`}>{c.name}</Chip>
        ))}
        {place.surface ? (
          <Chip>povrch: {SURFACE_LABEL[place.surface as SurfaceLiteral]}</Chip>
        ) : null}
        {place.hasWc ? <Chip>WC</Chip> : <Chip muted>bez WC</Chip>}
        {place.sleeps ? <Chip>{place.sleeps} míst</Chip> : null}
        {place.elevationM ? <Chip>{place.elevationM} m n. m.</Chip> : null}
        {place.isFree ? <Chip>zdarma</Chip> : null}
      </section>

      {place.description ? (
        <section className="mt-8">
          <h2 className="text-xl font-semibold">Popis</h2>
          <p className="mt-3 whitespace-pre-line leading-relaxed text-[color:var(--foreground)]">
            {place.description}
          </p>
        </section>
      ) : null}

      {place.amenities.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-xl font-semibold">Vybavení</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {place.amenities.map((a) => (
              <li key={a.id}>
                <Chip>{a.label}</Chip>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {coords ? (
        <section className="mt-10">
          <h2 className="text-xl font-semibold">Kde to je</h2>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            {coords.lat.toFixed(4)}° N, {coords.lng.toFixed(4)}° E
          </p>
          <div className="mt-4 h-72 overflow-hidden rounded-2xl border border-[color:var(--border)]">
            <DetailMiniMapLoader
              lat={coords.lat}
              lng={coords.lng}
              name={place.name}
            />
          </div>
          {mapyHref ? (
            <a
              href={mapyHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--accent)] hover:text-[color:var(--accent-hover)]"
            >
              Jak se dostat (Mapy.cz) →
            </a>
          ) : null}
        </section>
      ) : null}

      <section className="mt-10 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 text-sm text-[color:var(--muted)]">
        <p>
          Zdroj: <strong className="text-[color:var(--foreground)]">{place.source}</strong>
          {place.sourceUrl && !place.sourceUrl.startsWith("seed://") ? (
            <>
              {" · "}
              <a
                href={place.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[color:var(--accent)] hover:text-[color:var(--accent-hover)]"
              >
                otevřít původní záznam
              </a>
            </>
          ) : null}
        </p>
      </section>
    </div>
  );
}

function Chip({
  children,
  muted = false,
}: {
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <span
      className={
        "inline-flex items-center rounded-full border px-3 py-1 text-sm " +
        (muted
          ? "border-dashed border-[color:var(--border)] bg-[color:var(--background)] text-[color:var(--muted)]"
          : "border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground)]")
      }
    >
      {children}
    </span>
  );
}

function DbErrorState() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-20 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">
        Detail teď nelze načíst
      </h1>
      <p className="mt-3 text-[color:var(--muted)]">
        Databáze je dočasně nedostupná. Zkus to za chvíli znovu.
      </p>
      <p className="mt-6">
        <Link
          href="/objevit"
          className="font-semibold text-[color:var(--accent)] hover:text-[color:var(--accent-hover)]"
        >
          Zpět na katalog
        </Link>
      </p>
    </div>
  );
}
