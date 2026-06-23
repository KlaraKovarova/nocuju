import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--border)] bg-[var(--background)]">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:grid-cols-3 lg:px-8">
        <div>
          <p className="text-base font-semibold tracking-tight text-[var(--foreground)]">
            nocuju<span className="text-[var(--accent)]">.cz</span>
          </p>
          <p className="mt-2 max-w-xs text-sm text-[var(--foreground-muted)]">
            Veřejně sdílená místa k přespání venku v Česku — útulny, sruby a
            nouzová nocoviště na jednom místě.
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--foreground-muted)]">
            Zdroje
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a
                href="https://www.boudy.info/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[var(--accent)] hover:underline"
              >
                boudy.info
              </a>
            </li>
            <li>
              <a
                href="https://www.viaczechia.cz/utulny/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[var(--accent)] hover:underline"
              >
                viaczechia.cz
              </a>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--foreground-muted)]">
            Kontakt
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link
                href="/o-projektu"
                className="hover:text-[var(--accent)] hover:underline"
              >
                O projektu
              </Link>
            </li>
            <li>
              <a
                href="https://github.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[var(--accent)] hover:underline"
              >
                GitHub
              </a>
            </li>
            <li>
              <a
                href="mailto:ahoj@nocuju.cz"
                className="hover:text-[var(--accent)] hover:underline"
              >
                ahoj@nocuju.cz
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[var(--border)]">
        <p className="mx-auto w-full max-w-7xl px-4 py-4 text-xs text-[var(--foreground-muted)] lg:px-8">
          © {new Date().getFullYear()} nocuju.cz · Data čerpáme z veřejných zdrojů,
          vždy ověř aktuální stav místa před výletem.
        </p>
      </div>
    </footer>
  );
}
