export type VerificationState = {
  at: Date;
  by: string | null;
  note: string | null;
} | null;

const inputClass =
  "block w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600";

// Admin action for variant-2 verification (NOC-98): the record was checked
// against a photo, map, or public source. Only this stamp shows publicly
// as "Ověřeno" — community signals render separately on the place card.
export function VerificationPanel({
  verification,
  actionUrl,
}: {
  verification: VerificationState;
  actionUrl: string;
}) {
  return (
    <section className="rounded border border-zinc-200 bg-white p-5">
      <header className="mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-700">
          Interní ověření
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Ověř záznam proti fotce, mapě nebo veřejnému zdroji. Jen takto
          ověřená místa dostanou veřejný badge „✓ Ověřeno“.
        </p>
      </header>

      {verification ? (
        <div className="space-y-4">
          <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <p className="font-semibold">
              ✓ Ověřeno {formatDateTime(verification.at)}
            </p>
            <p className="mt-1 text-emerald-800">
              Ověřil/a: {verification.by ?? "—"}
            </p>
            {verification.note && (
              <p className="mt-1 whitespace-pre-wrap text-emerald-800">
                Poznámka: {verification.note}
              </p>
            )}
          </div>
          <form method="POST" action={actionUrl}>
            <input type="hidden" name="intent" value="unverify" />
            <button
              type="submit"
              className="rounded border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
            >
              Zrušit ověření
            </button>
          </form>
        </div>
      ) : (
        <form method="POST" action={actionUrl} className="space-y-4">
          <input type="hidden" name="intent" value="verify" />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="block text-xs font-medium text-zinc-700">
                Ověřil/a
              </span>
              <div className="mt-1">
                <input
                  name="verifiedBy"
                  maxLength={128}
                  placeholder="admin"
                  className={inputClass}
                />
              </div>
            </label>
          </div>
          <label className="block">
            <span className="block text-xs font-medium text-zinc-700">
              Poznámka (volitelná — proti čemu bylo ověřeno)
            </span>
            <div className="mt-1">
              <textarea
                name="note"
                rows={2}
                maxLength={500}
                className={inputClass}
                placeholder="Zkontrolováno proti mapy.cz + fotce z boudy.info"
              />
            </div>
          </label>
          <button
            type="submit"
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            ✓ Ověřit místo
          </button>
        </form>
      )}
    </section>
  );
}

function formatDateTime(d: Date): string {
  try {
    return new Intl.DateTimeFormat("cs-CZ", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return "";
  }
}
