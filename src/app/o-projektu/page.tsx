import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "O projektu",
  description:
    "Komunitní katalog českých útulen a nouzových nocovišť. Open-source, nezávislý, bez reklam.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--accent)]">
        O projektu
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">
        Proč nocuju.cz
      </h1>
      <div className="prose prose-zinc mt-8 max-w-none text-[color:var(--foreground)]">
        <p className="text-lg leading-relaxed text-[color:var(--muted)]">
          Útulny a nouzová nocoviště jsou roztroušené po veřejných zdrojích,
          fórech a osobních blozích. nocuju.cz je pokus to celé sesypat na
          jednu hromadu — mapa, katalog, několik praktických detailů. Žádné
          rezervace, žádné poplatky, žádné reklamy.
        </p>
        <h2 className="mt-10 text-xl font-semibold">Zdroje dat</h2>
        <ul className="mt-3 space-y-2 text-[color:var(--muted)]">
          <li>
            <a
              href="https://boudy.info"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[color:var(--accent)] hover:text-[color:var(--accent-hover)]"
            >
              boudy.info
            </a>{" "}
            — historická databáze útulen a horských chat.
          </li>
          <li>
            <a
              href="https://viaczechia.cz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[color:var(--accent)] hover:text-[color:var(--accent-hover)]"
            >
              viaczechia.cz
            </a>{" "}
            — dálková trasa napříč ČR s pečlivě zmapovanými přespávačkami.
          </li>
          <li>Vlastní příspěvky a opravy od turistů.</li>
        </ul>

        <h2 className="mt-10 text-xl font-semibold">Etika v útulně</h2>
        <ul className="mt-3 space-y-2 text-[color:var(--muted)]">
          <li>Neničíme. Co přineseš, odneseš.</li>
          <li>Nezapaluješ otevřený oheň mimo vyhrazená ohniště.</li>
          <li>Místa pro krátké přespání — ne pro kemping na dny.</li>
          <li>Pokud něco najdeš jinak než je tu uvedeno, dej nám vědět.</li>
        </ul>

        <h2 className="mt-10 text-xl font-semibold">Kontakt</h2>
        <p className="mt-3 text-[color:var(--muted)]">
          Email:{" "}
          <a
            href="mailto:ahoj@nocuju.cz"
            className="text-[color:var(--accent)] hover:text-[color:var(--accent-hover)]"
          >
            ahoj@nocuju.cz
          </a>
          <br />
          Kód:{" "}
          <a
            href="https://github.com/KlaraKovarova/nocuju"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[color:var(--accent)] hover:text-[color:var(--accent-hover)]"
          >
            github.com/KlaraKovarova/nocuju
          </a>
        </p>
      </div>

      <div className="mt-12 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 text-sm text-[color:var(--muted)]">
        Chceš začít hledat?{" "}
        <Link
          href="/objevit"
          className="font-semibold text-[color:var(--accent)] hover:text-[color:var(--accent-hover)]"
        >
          Procházet seznam
        </Link>{" "}
        nebo{" "}
        <Link
          href="/mapa"
          className="font-semibold text-[color:var(--accent)] hover:text-[color:var(--accent-hover)]"
        >
          otevřít mapu
        </Link>
        .
      </div>
    </div>
  );
}
