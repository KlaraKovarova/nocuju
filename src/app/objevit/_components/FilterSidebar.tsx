import type { ParsedFilters } from "../filters";

export type FilterOption = { value: string; label: string; count?: number };

type Props = {
  filters: ParsedFilters;
  categoryOptions: FilterOption[];
  surfaceOptions: FilterOption[];
  action?: string;
  resetHref?: string;
};

export function FilterSidebar({
  filters,
  categoryOptions,
  surfaceOptions,
  action = "/objevit",
  resetHref = "/objevit",
}: Props) {
  return (
    <aside className="w-full shrink-0 lg:w-72">
      <form
        method="GET"
        action={action}
        className="flex flex-col gap-6 rounded-lg border border-zinc-200 bg-white p-5"
      >
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-700">
            Kategorie
          </h2>
          <div className="flex flex-col gap-2">
            {categoryOptions.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-2 text-sm text-zinc-800"
              >
                <input
                  type="checkbox"
                  name="kategorie"
                  value={opt.value}
                  defaultChecked={filters.categories.includes(opt.value)}
                  className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-700">
            Povrch
          </h2>
          <div className="flex flex-col gap-2">
            {surfaceOptions.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-2 text-sm text-zinc-800"
              >
                <input
                  type="checkbox"
                  name="povrch"
                  value={opt.value}
                  defaultChecked={filters.surfaces.includes(opt.value)}
                  className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-700">
            WC
          </h2>
          <div className="flex flex-col gap-2 text-sm text-zinc-800">
            {[
              { value: "", label: "Nezáleží" },
              { value: "yes", label: "Ano" },
              { value: "no", label: "Ne" },
            ].map((opt) => (
              <label key={opt.value || "any"} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="wc"
                  value={opt.value}
                  defaultChecked={(filters.wc ?? "") === opt.value}
                  className="h-4 w-4 border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-700">
            Min. počet míst
          </h2>
          <input
            type="number"
            name="sleeps_min"
            min={0}
            step={1}
            defaultValue={filters.sleepsMin ?? ""}
            placeholder="např. 4"
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Filtrovat
          </button>
          <a
            href={resetHref}
            className="rounded border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
          >
            Zrušit
          </a>
        </div>
      </form>
    </aside>
  );
}
