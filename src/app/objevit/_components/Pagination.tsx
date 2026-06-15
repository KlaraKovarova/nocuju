import { buildPageHref, type ParsedFilters } from "../filters";

type Props = {
  filters: ParsedFilters;
  totalPages: number;
};

export function Pagination({ filters, totalPages }: Props) {
  if (totalPages <= 1) return null;
  const current = filters.page;
  const pages: number[] = [];
  const start = Math.max(1, current - 2);
  const end = Math.min(totalPages, current + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <nav
      aria-label="Stránkování"
      className="mt-8 flex items-center justify-center gap-1"
    >
      {current > 1 && (
        <a
          href={buildPageHref(filters, current - 1)}
          className="rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
        >
          ← Předchozí
        </a>
      )}
      {pages[0] !== 1 && (
        <>
          <a
            href={buildPageHref(filters, 1)}
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            1
          </a>
          {pages[0] > 2 && <span className="px-1 text-zinc-400">…</span>}
        </>
      )}
      {pages.map((p) => (
        <a
          key={p}
          href={buildPageHref(filters, p)}
          aria-current={p === current ? "page" : undefined}
          className={
            p === current
              ? "rounded border border-emerald-600 bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white"
              : "rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
          }
        >
          {p}
        </a>
      ))}
      {pages[pages.length - 1] !== totalPages && (
        <>
          {pages[pages.length - 1] < totalPages - 1 && (
            <span className="px-1 text-zinc-400">…</span>
          )}
          <a
            href={buildPageHref(filters, totalPages)}
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            {totalPages}
          </a>
        </>
      )}
      {current < totalPages && (
        <a
          href={buildPageHref(filters, current + 1)}
          className="rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
        >
          Další →
        </a>
      )}
    </nav>
  );
}
