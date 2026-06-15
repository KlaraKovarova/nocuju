import Link from "next/link";

import { getPlaceStats } from "@/lib/places";
import { tryDb } from "@/lib/safe-db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function Home() {
  const statsResult = await tryDb(() => getPlaceStats());
  const stats = statsResult.ok
    ? statsResult.value
    : { total: 0, utulna: 0, nouzove: 0 };

  return (
    <div className="bg-[color:var(--background)]">
      <section className="border-b border-[color:var(--border)]">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 md:grid-cols-[1.2fr_1fr] md:py-28">
          <div className="flex flex-col justify-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--accent)]">
              Útulny &amp; nouzová nocoviště v ČR
            </p>
            <h1 className="mt-4 text-5xl font-semibold leading-[1.05] tracking-tight text-[color:var(--foreground)] sm:text-6xl">
              Najdi místo, kde můžeš v klidu přespat.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-[color:var(--muted)]">
              Volně přístupné útulny, přístřešky a nouzová nocoviště v českých
              horách. Bez rezervací, bez poplatků, jen mapa a několik užitečných
              detailů.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/objevit"
                className="inline-flex items-center justify-center rounded-full bg-[color:var(--accent)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[color:var(--accent-hover)]"
              >
                Objevovat místa
              </Link>
              <Link
                href="/mapa"
                className="inline-flex items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-6 py-3 text-sm font-semibold text-[color:var(--foreground)] transition-colors hover:border-[color:var(--foreground)]"
              >
                Otevřít mapu
              </Link>
            </div>
            {stats.total > 0 ? (
              <p className="mt-8 text-sm text-[color:var(--muted)]">
                Aktuálně v katalogu:{" "}
                <strong className="text-[color:var(--foreground)]">
                  {stats.total} míst
                </strong>{" "}
                — {stats.utulna} útulen, {stats.nouzove} nouzových nocovišť.
              </p>
            ) : null}
          </div>
          <div className="hidden md:flex md:items-stretch">
            <div
              aria-hidden
              className="relative flex-1 overflow-hidden rounded-3xl bg-gradient-to-br from-[#3a6b48] via-[#5d8b56] to-[#cfd6b5] shadow-xl"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_55%)]" />
              <div className="absolute bottom-6 left-6 right-6 rounded-2xl bg-white/85 p-5 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                  Tip ze sezóny
                </p>
                <p className="mt-1.5 text-base font-medium text-[color:var(--foreground)]">
                  Útulny v Jizerských horách jsou v zimě nejvyhledávanější —
                  počítej s plnou kapacitou.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[color:var(--border)]">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">
                Co u nás najdeš
              </h2>
              <p className="mt-2 max-w-xl text-[color:var(--muted)]">
                Dvě hlavní kategorie podle toho, co potřebuješ.
              </p>
            </div>
            <Link
              href="/objevit"
              className="text-sm font-semibold text-[color:var(--accent)] hover:text-[color:var(--accent-hover)]"
            >
              Procházet všechna místa →
            </Link>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <CategoryTile
              href="/objevit?kategorie=utulna"
              eyebrow="Kategorie"
              title="Útulny"
              description="Stavby určené k volnému přespání — palandy, kamna, střecha nad hlavou. Většinou v horách, na hřebenech a dálkových trasách."
              gradient="from-[#5d8b56] via-[#9eb188] to-[#dfe6c3]"
              count={stats.utulna}
              countLabel="útulen"
            />
            <CategoryTile
              href="/objevit?kategorie=nouzove-nocoviste"
              eyebrow="Kategorie"
              title="Nouzová nocoviště"
              description="Přístřešky, lavice s ohništěm, otevřená místa pro krátké přečkání nepřízně počasí. Bez vybavení, ale lépe než nic."
              gradient="from-[#7b5a3a] via-[#b08b6a] to-[#e6d4ba]"
              count={stats.nouzove}
              countLabel="nocovišť"
            />
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-16 md:grid-cols-3">
          <Feature
            title="Otevřená data"
            body="Vychází z veřejných zdrojů (boudy.info, viaczechia) a vlastních příspěvků. Vše je open-source."
          />
          <Feature
            title="Bez reklam a registrace"
            body="Žádné popupy, žádné cookie banery, žádné rezervace. Jen mapa a praktické informace."
          />
          <Feature
            title="Offline-friendly"
            body="Souřadnice a otevírací režim jsou hned na detailu. Odkaz „jak se dostat“ otevře Mapy.cz."
          />
        </div>
      </section>
    </div>
  );
}

function CategoryTile({
  href,
  eyebrow,
  title,
  description,
  gradient,
  count,
  countLabel,
}: {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  gradient: string;
  count: number;
  countLabel: string;
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-sm transition-shadow hover:shadow-md"
    >
      <div
        aria-hidden
        className={`relative h-44 bg-gradient-to-br ${gradient}`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.25),transparent_50%)]" />
      </div>
      <div className="flex flex-1 flex-col p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
          {eyebrow}
        </p>
        <h3 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h3>
        <p className="mt-3 flex-1 text-[color:var(--muted)]">{description}</p>
        <div className="mt-5 flex items-center justify-between text-sm">
          <span className="text-[color:var(--muted)]">
            {count > 0 ? `${count} ${countLabel}` : "Připravujeme"}
          </span>
          <span className="font-semibold text-[color:var(--accent)] group-hover:text-[color:var(--accent-hover)]">
            Prohlédnout →
          </span>
        </div>
      </div>
    </Link>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[color:var(--muted)]">
        {body}
      </p>
    </div>
  );
}
