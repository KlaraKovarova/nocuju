import {
  SURFACE_LABEL,
  filtersToQueryString,
  type PlaceListFilters,
  type SurfaceLiteral,
} from "@/lib/places";
import type { Category } from "@/db/schema";

type Props = {
  basePath: string;
  filters: PlaceListFilters;
  categories: Category[];
};

const SURFACES: SurfaceLiteral[] = [
  "kamenna",
  "drevena",
  "hlinena",
  "trava",
  "mix",
];

export function FilterSidebar({ basePath, filters, categories }: Props) {
  const toggleCategory = (slug: string): PlaceListFilters => {
    const set = new Set(filters.categorySlugs ?? []);
    if (set.has(slug)) set.delete(slug);
    else set.add(slug);
    return { ...filters, categorySlugs: Array.from(set) };
  };

  const toggleSurface = (s: SurfaceLiteral): PlaceListFilters => {
    const set = new Set(filters.surfaces ?? []);
    if (set.has(s)) set.delete(s);
    else set.add(s);
    return { ...filters, surfaces: Array.from(set) };
  };

  const setWc = (value: boolean | null): PlaceListFilters => ({
    ...filters,
    hasWc: value,
  });

  const setSleepsMin = (value: number | null): PlaceListFilters => ({
    ...filters,
    sleepsMin: value,
  });

  const link = (next: PlaceListFilters) => `${basePath}${filtersToQueryString(next)}`;

  const isCategoryActive = (slug: string) =>
    (filters.categorySlugs ?? []).includes(slug);
  const isSurfaceActive = (s: SurfaceLiteral) =>
    (filters.surfaces ?? []).includes(s);

  const hasAny =
    (filters.categorySlugs?.length ?? 0) > 0 ||
    (filters.surfaces?.length ?? 0) > 0 ||
    filters.hasWc !== null ||
    (filters.sleepsMin ?? 0) > 0;

  return (
    <aside className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[color:var(--muted)]">
          Filtr
        </h2>
        {hasAny ? (
          <a
            href={basePath}
            className="text-xs font-semibold text-[color:var(--accent)] hover:text-[color:var(--accent-hover)]"
          >
            Vyčistit
          </a>
        ) : null}
      </div>

      <FilterGroup label="Kategorie">
        {categories.map((c) => (
          <ChipLink
            key={c.id}
            href={link(toggleCategory(c.slug))}
            active={isCategoryActive(c.slug)}
          >
            {c.name}
          </ChipLink>
        ))}
      </FilterGroup>

      <FilterGroup label="Povrch">
        {SURFACES.map((s) => (
          <ChipLink
            key={s}
            href={link(toggleSurface(s))}
            active={isSurfaceActive(s)}
          >
            {SURFACE_LABEL[s]}
          </ChipLink>
        ))}
      </FilterGroup>

      <FilterGroup label="WC">
        <ChipLink href={link(setWc(filters.hasWc === true ? null : true))} active={filters.hasWc === true}>
          Ano
        </ChipLink>
        <ChipLink href={link(setWc(filters.hasWc === false ? null : false))} active={filters.hasWc === false}>
          Ne
        </ChipLink>
      </FilterGroup>

      <FilterGroup label="Min. počet míst">
        {[2, 4, 6, 8].map((n) => (
          <ChipLink
            key={n}
            href={link(setSleepsMin(filters.sleepsMin === n ? null : n))}
            active={filters.sleepsMin === n}
          >
            {n}+
          </ChipLink>
        ))}
      </FilterGroup>
    </aside>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function ChipLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className={
        "inline-flex items-center rounded-full border px-3 py-1.5 text-sm transition-colors " +
        (active
          ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-white"
          : "border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground)] hover:border-[color:var(--foreground)]")
      }
    >
      {children}
    </a>
  );
}
