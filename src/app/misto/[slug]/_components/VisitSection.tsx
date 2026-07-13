import Link from "next/link";

import type { SessionUser } from "@/lib/user-auth";
import { formatVisitCount, todayIsoDate } from "@/lib/visits";

export type VisitStatus = "idle" | "saved" | "duplicate" | "error";

// Community visits — intentionally informal ("🥾 … komunity"), must not be
// confused with the official "Ověřeno" badge reserved for admin verification.
export function VisitSection({
  placeId,
  visitsCount,
  user,
  loginHref,
  status,
  errorMessage,
}: {
  placeId: number;
  visitsCount: number;
  user: SessionUser | null;
  loginHref: string;
  status: VisitStatus;
  errorMessage?: string | null;
}) {
  const today = todayIsoDate();
  return (
    <section
      id="navsteva"
      className="mt-8 rounded-lg border border-zinc-200 bg-zinc-50/60 p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-900">
          🥾 {formatVisitCount(visitsCount)}
        </h2>
      </div>
      <p className="mt-1 text-xs text-zinc-500">
        Návštěvy hlásí sama komunita — není to oficiální ověření místa.
      </p>

      {status === "saved" && (
        <p
          role="status"
          className="mt-3 rounded border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
        >
          Díky, návštěva je zapsaná! 🥾
        </p>
      )}
      {status === "duplicate" && (
        <p
          role="status"
          className="mt-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          Tenhle den už tu od tebe zapsaný máme.
        </p>
      )}
      {status === "error" && errorMessage && (
        <p
          role="alert"
          className="mt-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {errorMessage}
        </p>
      )}

      {user ? (
        <form
          method="POST"
          action="/api/visits"
          className="mt-4 flex flex-wrap items-end gap-3"
        >
          <input type="hidden" name="placeId" value={placeId} />
          <div>
            <label
              htmlFor="visit-date"
              className="mb-1 block text-sm font-medium text-zinc-800"
            >
              Kdy jsi tu byl(a)?
            </label>
            <input
              id="visit-date"
              name="visitedOn"
              type="date"
              required
              defaultValue={today}
              max={today}
              className="rounded border border-zinc-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>
          <button
            type="submit"
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Byl(a) jsem tam
          </button>
        </form>
      ) : (
        <p className="mt-4 text-sm text-zinc-600">
          Byl(a) jsi tu?{" "}
          <Link
            href={loginHref}
            className="font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
          >
            Přihlas se
          </Link>{" "}
          a zapiš svou návštěvu.
        </p>
      )}
    </section>
  );
}
