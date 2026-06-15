import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-[color:var(--border)] bg-[color:var(--surface)]/80 backdrop-blur supports-[backdrop-filter]:bg-[color:var(--surface)]/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="flex items-baseline gap-1.5 text-lg font-semibold tracking-tight"
        >
          <span>nocuju</span>
          <span className="text-[color:var(--accent)]">.cz</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium text-[color:var(--muted)]">
          <Link
            href="/objevit"
            className="transition-colors hover:text-[color:var(--foreground)]"
          >
            Objevit
          </Link>
          <Link
            href="/mapa"
            className="transition-colors hover:text-[color:var(--foreground)]"
          >
            Mapa
          </Link>
          <Link
            href="/o-projektu"
            className="transition-colors hover:text-[color:var(--foreground)]"
          >
            O projektu
          </Link>
        </nav>
      </div>
    </header>
  );
}
