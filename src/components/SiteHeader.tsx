import Link from "next/link";

const NAV_ITEMS = [
  { href: "/objevit", label: "Objevit" },
  { href: "/mapa", label: "Mapa" },
  { href: "/o-projektu", label: "O projektu" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-[var(--border)] bg-[var(--background)]/85 backdrop-blur supports-[backdrop-filter]:bg-[var(--background)]/70">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 lg:px-8">
        <Link
          href="/"
          className="flex items-baseline gap-2 text-xl font-semibold tracking-tight text-[var(--foreground)] hover:text-[var(--accent)]"
          aria-label="NOC — domů"
        >
          <span>NOC</span>
          <span className="hidden text-xs font-normal uppercase tracking-[0.18em] text-[var(--foreground-muted)] sm:inline">
            kde přespat venku
          </span>
        </Link>
        <nav aria-label="Hlavní navigace">
          <ul className="flex items-center gap-1 sm:gap-2">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="rounded-md px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface)] hover:text-[var(--accent)]"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
