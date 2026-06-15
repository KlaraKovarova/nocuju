import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "O projektu",
  description:
    "NOC je veřejně sdílený seznam míst k přespání venku v Česku — útulen, srubů a nouzových nocovišť. Data sbíráme z boudy.info a viaczechia.cz.",
};

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16 lg:px-8 lg:py-24">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
        O projektu
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl">
        NOC
      </h1>
      <p className="mt-6 text-lg leading-relaxed text-[var(--foreground-muted)]">
        NOC sbírá veřejně známá místa k přespání venku v Česku — turistické
        útulny, sruby a nouzová nocoviště — a dává je na jedno přehledné místo.
        Cílem je, aby si turista, cyklista nebo poutník mohl rychle najít, kde
        přespat na trase.
      </p>

      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
          Odkud bereme data
        </h2>
        <p className="mt-3 text-base leading-relaxed text-[var(--foreground-muted)]">
          Záznamy čerpáme z veřejně dostupných zdrojů:
        </p>
        <ul className="mt-4 space-y-3 text-base">
          <li>
            <a
              href="https://www.boudy.info/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[var(--accent)] hover:underline"
            >
              boudy.info
            </a>
            <span className="text-[var(--foreground-muted)]">
              {" "}
              — komunitní databáze útulen a srubů v ČR.
            </span>
          </li>
          <li>
            <a
              href="https://www.viaczechia.cz/utulny/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[var(--accent)] hover:underline"
            >
              viaczechia.cz/utulny
            </a>
            <span className="text-[var(--foreground-muted)]">
              {" "}
              — útulny na dálkové trase Via Czechia.
            </span>
          </li>
        </ul>
        <p className="mt-4 text-sm text-[var(--foreground-muted)]">
          Před výletem si vždy ověř aktuální stav místa u zdroje — útulny mizí,
          přestavují se a pravidla se mění.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
          Kontakt
        </h2>
        <p className="mt-3 text-base leading-relaxed text-[var(--foreground-muted)]">
          Něco chybí, něco nesedí, nebo chceš pomoct? Napiš nám na{" "}
          <a
            href="mailto:ahoj@nocuju.cz"
            className="font-medium text-[var(--accent)] hover:underline"
          >
            ahoj@nocuju.cz
          </a>
          .
        </p>
      </section>

      <div className="mt-12 flex flex-wrap gap-3">
        <Link
          href="/objevit"
          className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[var(--accent-fg)] hover:bg-[var(--accent-hover)]"
        >
          Objevit místa
          <span aria-hidden>→</span>
        </Link>
        <Link
          href="/mapa"
          className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-semibold hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          Otevřít mapu
        </Link>
      </div>
    </main>
  );
}
