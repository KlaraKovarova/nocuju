import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-[color:var(--border)] bg-[color:var(--surface)]">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 text-sm text-[color:var(--muted)] sm:grid-cols-3">
        <div>
          <p className="text-base font-semibold text-[color:var(--foreground)]">
            nocuju<span className="text-[color:var(--accent)]">.cz</span>
          </p>
          <p className="mt-2 max-w-xs leading-relaxed">
            Mapa a katalog českých útulen a nouzových nocovišť. Open-source,
            nezávislý, bez reklam.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--foreground)]">
            Zdroje dat
          </p>
          <ul className="mt-3 space-y-1.5">
            <li>
              <a
                href="https://boudy.info"
                className="hover:text-[color:var(--foreground)]"
                target="_blank"
                rel="noopener noreferrer"
              >
                boudy.info
              </a>
            </li>
            <li>
              <a
                href="https://viaczechia.cz"
                className="hover:text-[color:var(--foreground)]"
                target="_blank"
                rel="noopener noreferrer"
              >
                viaczechia.cz
              </a>
            </li>
            <li>Vlastní příspěvky od turistů.</li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--foreground)]">
            Projekt
          </p>
          <ul className="mt-3 space-y-1.5">
            <li>
              <Link
                href="/o-projektu"
                className="hover:text-[color:var(--foreground)]"
              >
                O projektu
              </Link>
            </li>
            <li>
              <a
                href="https://github.com/KlaraKovarova/nocuju"
                className="hover:text-[color:var(--foreground)]"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
            </li>
            <li>
              <a
                href="mailto:ahoj@nocuju.cz"
                className="hover:text-[color:var(--foreground)]"
              >
                ahoj@nocuju.cz
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[color:var(--border)]">
        <div className="mx-auto max-w-6xl px-6 py-4 text-xs text-[color:var(--muted)]">
          © {new Date().getFullYear()} nocuju.cz · Mapové podklady ©{" "}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[color:var(--foreground)]"
          >
            OpenStreetMap přispěvatelé
          </a>
        </div>
      </div>
    </footer>
  );
}
