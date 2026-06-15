import Link from "next/link";

import { SURFACE_LABEL, type PlaceSummary, type SurfaceLiteral } from "@/lib/places";

const CATEGORY_GRADIENT: Record<string, string> = {
  utulna: "from-[#5d8b56] via-[#9eb188] to-[#dfe6c3]",
  "nouzove-nocoviste": "from-[#7b5a3a] via-[#b08b6a] to-[#e6d4ba]",
};

export function PlaceCard({ place }: { place: PlaceSummary }) {
  const primaryCategory = place.categories[0];
  const gradient = primaryCategory
    ? CATEGORY_GRADIENT[primaryCategory.slug] ?? CATEGORY_GRADIENT.utulna
    : CATEGORY_GRADIENT.utulna;

  return (
    <Link
      href={`/misto/${place.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-sm transition-shadow hover:shadow-md"
    >
      <div
        aria-hidden
        className={`relative h-40 bg-gradient-to-br ${gradient}`}
      >
        {place.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={place.image.url}
            alt={place.image.alt ?? place.name}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.2),transparent_55%)]" />
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {place.categories.map((c) => (
            <span
              key={c.id}
              className="rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--foreground)] shadow-sm"
            >
              {c.name}
            </span>
          ))}
        </div>
      </div>
      <div className="flex flex-1 flex-col px-5 py-4">
        <h3 className="text-base font-semibold tracking-tight group-hover:text-[color:var(--accent)]">
          {place.name}
        </h3>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          {place.city ? place.city : "Neznámá lokalita"}
          {place.region ? ` · ${place.region}` : ""}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-medium text-[color:var(--muted)]">
          {place.surface ? (
            <Badge>
              povrch: {SURFACE_LABEL[place.surface as SurfaceLiteral]}
            </Badge>
          ) : null}
          {place.hasWc ? <Badge>WC</Badge> : null}
          {place.sleeps ? <Badge>{place.sleeps} míst</Badge> : null}
          {place.elevationM ? <Badge>{place.elevationM} m n. m.</Badge> : null}
        </div>
      </div>
    </Link>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--background)] px-2 py-0.5">
      {children}
    </span>
  );
}
