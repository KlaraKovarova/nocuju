import Link from "next/link";

import { CategoryIcon } from "@/components/CategoryIcon";
import { SaveToggle } from "@/components/SaveToggle";
import type { Place } from "@/db/schema";
import { formatVisitCount } from "@/lib/visits";

export type PlaceCardData = {
  place: Pick<
    Place,
    "id" | "slug" | "name" | "surface" | "hasWc" | "sleeps"
  >;
  city: string | null;
  region: string | null;
  categorySlugs: string[];
  imageUrl: string | null;
  visitsCount: number;
  // Set only for admin-verified places (variant 2, NOC-98) — renders the
  // official "✓ Ověřeno" badge. Optional so list queries can adopt it
  // incrementally.
  adminVerifiedAt?: Date | null;
};

const CATEGORY_LABEL: Record<string, string> = {
  utulna: "Útulna",
  "nouzove-nocoviste": "Nouzové nocoviště",
};

const SURFACE_LABEL: Record<string, string> = {
  kamenna: "Kamenná",
  drevena: "Dřevěná",
  hlinena: "Hliněná",
  trava: "Travnatá",
  mix: "Smíšená",
};

function PlaceholderImage({
  name,
  category,
}: {
  name: string;
  category?: string;
}) {
  const palette =
    category === "nouzove-nocoviste"
      ? "from-amber-700 to-amber-900"
      : "from-emerald-700 to-emerald-900";
  return (
    <div
      aria-label={name}
      className={`flex h-40 w-full items-center justify-center bg-gradient-to-br text-white/90 ${palette}`}
    >
      <CategoryIcon category={category} size={52} mono />
    </div>
  );
}

export function PlaceCard({ data }: { data: PlaceCardData }) {
  const { place, city, region, categorySlugs, imageUrl, visitsCount } = data;
  const adminVerified = Boolean(data.adminVerifiedAt);
  return (
    <Link
      href={`/misto/${place.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white transition hover:border-emerald-500 hover:shadow-md"
    >
      <div className="relative">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={place.name}
            className="h-40 w-full object-cover"
          />
        ) : (
          <PlaceholderImage name={place.name} category={categorySlugs[0]} />
        )}
        <div className="absolute right-2 top-2">
          <SaveToggle slug={place.slug} />
        </div>
        {adminVerified && (
          <span
            title="Záznam ověřil tým NOC proti fotce, mapě nebo veřejnému zdroji."
            className="absolute left-2 top-2 rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white"
          >
            ✓ Ověřeno
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-lg font-semibold text-zinc-900 group-hover:text-emerald-700">
          {place.name}
        </h3>
        {(city || region) && (
          <p className="text-sm text-zinc-600">
            {[city, region].filter(Boolean).join(", ")}
          </p>
        )}
        <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
          {categorySlugs.map((slug) => (
            <span
              key={slug}
              className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
            >
              {CATEGORY_LABEL[slug] ?? slug}
            </span>
          ))}
          {place.surface && (
            <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
              {SURFACE_LABEL[place.surface] ?? place.surface}
            </span>
          )}
          {place.hasWc && (
            <span className="rounded bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800">
              WC
            </span>
          )}
          {typeof place.sleeps === "number" && (
            <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
              {place.sleeps} míst
            </span>
          )}
          {visitsCount > 0 && (
            <span
              title="Návštěvy nahlášené registrovanými uživateli — není to oficiální ověření."
              className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600"
            >
              🥾 {formatVisitCount(visitsCount)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
