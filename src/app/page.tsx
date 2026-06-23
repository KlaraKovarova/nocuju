import { sql } from "drizzle-orm";
import Link from "next/link";

import { db } from "@/db/client";
import { places } from "@/db/schema";

async function countPlaces(): Promise<number> {
  try {
    const [row] = (await db
      .select({ count: sql<number>`count(*)` })
      .from(places)) as Array<{ count: number }>;
    return Number(row?.count ?? 0);
  } catch {
    return 0;
  }
}

type Tile = {
  href: string;
  eyebrow: string;
  title: string;
  blurb: string;
  palette: string;
  icon: React.ReactNode;
  image?: string;
  imageAlt?: string;
};

const TILES: Tile[] = [
  {
    href: "/objevit?category=utulna",
    eyebrow: "Turistická útulna",
    title: "Útulny",
    blurb:
      "Otevřené dřevěnky, sruby a přístřešky volně dostupné každému turistovi.",
    palette: "from-emerald-800 via-emerald-700 to-emerald-900",
    icon: <CabinIcon />,
    image: "/category-utulna.webp",
    imageAlt: "Dřevěná horská útulna s pryčnami a kamnama",
  },
  {
    href: "/objevit?category=nouzove-nocoviste",
    eyebrow: "Nouzové místo",
    title: "Nouzová nocoviště",
    blurb:
      "Lean-to, ohniště a jednoduché přístřešky pro případ nepohody nebo nouze.",
    palette: "from-amber-700 via-amber-600 to-amber-800",
    icon: <TentIcon />,
    image: "/category-nouzove.webp",
    imageAlt: "Otevřený přístřešek v jehličnatém lese u ohniště",
  },
];

export default async function HomePage() {
  const total = await countPlaces();

  return (
    <main>
      <section className="border-b border-[var(--border)]">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:px-8 lg:py-24">
          <div className="flex flex-col justify-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
              {total > 0 ? `${total} ${pluralizeMista(total)} v databázi` : "Nová databáze"}
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tight text-[var(--foreground)] sm:text-5xl lg:text-6xl">
              Kde v Česku <span className="text-[var(--accent)]">přespat</span>{" "}
              venku.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-[var(--foreground-muted)]">
              Sbíráme veřejně známé útulny, sruby a nouzová nocoviště z celé
              republiky do jednoho přehledného seznamu. Najdi místo na trase a
              jdi spát ven.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/objevit"
                className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 text-base font-semibold text-[var(--accent-fg)] shadow-sm hover:bg-[var(--accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                Objevit místa
                <span aria-hidden>→</span>
              </Link>
              <Link
                href="/mapa"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-6 py-3 text-base font-semibold text-[var(--foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                Objevit na mapě
              </Link>
            </div>
          </div>

          <div className="relative hidden lg:block">
            <HeroIllustration />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 lg:px-8 lg:py-20">
        <header className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
            Co najdeš v NOC
          </h2>
          <p className="mt-3 text-base text-[var(--foreground-muted)]">
            Dvě hlavní kategorie míst k přespání venku. Procházej je podle typu
            nebo si je zobraz na mapě.
          </p>
        </header>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {TILES.map((tile) => (
            <Link
              key={tile.href}
              href={tile.href}
              className="group relative flex aspect-[5/4] flex-col justify-between overflow-hidden rounded-2xl border border-[var(--border)] p-6 text-white shadow-sm transition hover:shadow-md sm:p-8"
            >
              <div
                aria-hidden
                className={`absolute inset-0 bg-gradient-to-br ${tile.palette}`}
              />
              {tile.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tile.image}
                  alt={tile.imageAlt ?? ""}
                  aria-hidden={!tile.imageAlt}
                  className="absolute inset-0 h-full w-full object-cover opacity-60 mix-blend-luminosity"
                  loading="lazy"
                />
              ) : null}
              <div
                aria-hidden
                className="absolute inset-0 opacity-25 mix-blend-overlay"
                style={{
                  background:
                    "radial-gradient(120% 60% at 100% 0%, rgba(255,255,255,0.65) 0%, transparent 60%)",
                }}
              />
              <div className="relative flex items-start justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/80">
                  {tile.eyebrow}
                </p>
                <span
                  aria-hidden
                  className="text-white/70 transition group-hover:translate-x-1 group-hover:text-white"
                >
                  →
                </span>
              </div>
              <div className="relative">
                <div className="mb-4 text-white/80">{tile.icon}</div>
                <h3 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  {tile.title}
                </h3>
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/85">
                  {tile.blurb}
                </p>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-4 text-sm text-[var(--foreground-muted)]">
          <Link
            href="/mapa"
            className="font-semibold text-[var(--accent)] hover:underline"
          >
            Objevit na mapě →
          </Link>
          <span aria-hidden>·</span>
          <Link
            href="/o-projektu"
            className="hover:text-[var(--foreground)] hover:underline"
          >
            Co je nocuju
          </Link>
        </div>
      </section>
    </main>
  );
}

function pluralizeMista(n: number): string {
  if (n === 1) return "místo";
  if (n >= 2 && n <= 4) return "místa";
  return "míst";
}

function CabinIcon() {
  return (
    <svg
      width="44"
      height="44"
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 24 24 8l18 16" />
      <path d="M10 22v18h28V22" />
      <path d="M20 40V28h8v12" />
    </svg>
  );
}

function TentIcon() {
  return (
    <svg
      width="44"
      height="44"
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 40 24 8l18 32" />
      <path d="M24 8v32" />
      <path d="M16 40h16" />
    </svg>
  );
}

function HeroIllustration() {
  return (
    <div className="relative h-full min-h-[360px] w-full overflow-hidden rounded-3xl border border-[var(--border)] bg-gradient-to-br from-emerald-900 via-emerald-800 to-slate-900">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/hero-utulna.webp"
        alt="Dřevěná útulna v mlhavém horském lese za úsvitu"
        className="absolute inset-0 h-full w-full object-cover"
        loading="eager"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      <div className="absolute bottom-6 left-6 right-6 rounded-xl bg-black/30 px-4 py-3 text-sm text-white/90 backdrop-blur">
        <p className="font-medium">Útulna v horském lese</p>
        <p className="text-white/70">Volně přístupná · bez rezervace</p>
      </div>
    </div>
  );
}
