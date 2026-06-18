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
  },
  {
    href: "/objevit?category=nouzove-nocoviste",
    eyebrow: "Nouzové místo",
    title: "Nouzová nocoviště",
    blurb:
      "Lean-to, ohniště a jednoduché přístřešky pro případ nepohody nebo nouze.",
    palette: "from-amber-700 via-amber-600 to-amber-800",
    icon: <TentIcon />,
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
      <svg
        viewBox="0 0 600 480"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0c1e1a" stopOpacity="0" />
            <stop offset="100%" stopColor="#0c1e1a" stopOpacity="0.85" />
          </linearGradient>
        </defs>
        <circle cx="470" cy="110" r="48" fill="#f5efe2" opacity="0.9" />
        <circle cx="455" cy="100" r="48" fill="#0d2421" />
        <path
          d="M0 320 L120 220 L210 290 L320 180 L420 280 L520 230 L600 290 L600 480 L0 480 Z"
          fill="#0a1a17"
        />
        <path
          d="M0 360 L90 290 L180 340 L280 270 L380 330 L480 280 L600 340 L600 480 L0 480 Z"
          fill="#08120f"
          opacity="0.9"
        />
        <rect width="600" height="480" fill="url(#sky)" />
        <g opacity="0.85" fill="#f5efe2">
          <circle cx="80" cy="80" r="1.5" />
          <circle cx="160" cy="60" r="1" />
          <circle cx="240" cy="100" r="1.2" />
          <circle cx="320" cy="50" r="1" />
          <circle cx="380" cy="140" r="1.4" />
          <circle cx="120" cy="160" r="1" />
          <circle cx="540" cy="180" r="1" />
        </g>
      </svg>
      <div className="absolute bottom-6 left-6 right-6 rounded-xl bg-black/30 px-4 py-3 text-sm text-white/90 backdrop-blur">
        <p className="font-medium">Útulna pod Boubínem</p>
        <p className="text-white/70">Šumava · 8 míst · WC</p>
      </div>
    </div>
  );
}
