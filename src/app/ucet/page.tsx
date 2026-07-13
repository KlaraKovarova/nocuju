import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import { places, placeVisits } from "@/db/schema";
import { getSessionUser } from "@/lib/user-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Můj účet",
  robots: { index: false },
};

function formatCzechDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return `${d}. ${m}. ${y}`;
}

export default async function UcetPage() {
  const user = await getSessionUser();
  if (!user) redirect("/ucet/prihlaseni");

  const visits = await db
    .select({
      id: placeVisits.id,
      visitedOn: placeVisits.visitedOn,
      placeName: places.name,
      placeSlug: places.slug,
    })
    .from(placeVisits)
    .innerJoin(places, eq(placeVisits.placeId, places.id))
    .where(eq(placeVisits.userId, user.id))
    .orderBy(desc(placeVisits.visitedOn), desc(placeVisits.id))
    .limit(100);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 lg:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Můj účet</h1>
          <p className="mt-2 text-zinc-600">
            {user.displayName ? `${user.displayName} · ` : ""}
            {user.email}
          </p>
        </div>
        <form method="POST" action="/api/auth/logout">
          <input type="hidden" name="next" value="/" />
          <button
            type="submit"
            className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50"
          >
            Odhlásit se
          </button>
        </form>
      </header>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-zinc-900">
          Moje návštěvy 🥾
        </h2>
        {visits.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600">
            Zatím žádné. Až u nějakého nocoviště přespíš, klikni na jeho
            detailu na „Byl(a) jsem tam“.{" "}
            <Link
              href="/objevit"
              className="font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
            >
              Objevit místa →
            </Link>
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
            {visits.map((visit) => (
              <li
                key={visit.id}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <Link
                  href={`/misto/${visit.placeSlug}`}
                  className="font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
                >
                  {visit.placeName}
                </Link>
                <span className="text-zinc-500">
                  {formatCzechDate(visit.visitedOn)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
