import { MAX_NOTE_LENGTH, REPORT_CATEGORY_LABEL } from "@/lib/reports";

const CATEGORY_ORDER = [
  "info-nesedi",
  "nema-ho-tam",
  "nebezpecne",
  "jine",
] as const;

export function ReportForm({
  placeId,
  slug,
  status,
  errorMessage,
}: {
  placeId: number;
  slug: string;
  status: "idle" | "sent" | "error";
  errorMessage?: string | null;
}) {
  const open = status !== "idle";
  return (
    <section className="mt-10 border-t border-zinc-200 pt-6" id="nahlasit">
      <details
        open={open}
        className="group rounded-lg border border-zinc-200 bg-zinc-50/60 p-4 [&_summary::-webkit-details-marker]:hidden"
      >
        <summary className="flex cursor-pointer items-center justify-between gap-3 list-none">
          <span className="text-sm font-semibold text-zinc-900">
            Nahlásit problém s místem
          </span>
          <span className="text-xs text-zinc-500 group-open:hidden">
            Otevřít formulář ↓
          </span>
          <span className="hidden text-xs text-zinc-500 group-open:inline">
            Skrýt ↑
          </span>
        </summary>

        <div className="mt-4">
          {status === "sent" ? (
            <div
              role="status"
              className="rounded border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900"
            >
              <p className="font-semibold">Díky, koukneme na to.</p>
              <p className="mt-1 text-emerald-800">
                Pokud jsi nechal/a e-mail, ozveme se, jakmile to vyřešíme.
              </p>
            </div>
          ) : (
            <>
              {status === "error" && errorMessage && (
                <p
                  role="alert"
                  className="mb-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
                >
                  {errorMessage}
                </p>
              )}
              <p className="mb-3 text-sm text-zinc-600">
                Něco nesedí? Útulna se rozpadla, foto neodpovídá, info je
                zastaralé? Dej nám vědět.
              </p>
              <form
                method="post"
                action="/api/reports"
                className="space-y-4"
              >
                <input type="hidden" name="placeId" value={placeId} />
                <input type="hidden" name="slug" value={slug} />
                {/* Honeypot — must stay empty. */}
                <div
                  aria-hidden="true"
                  className="absolute left-[-9999px] top-[-9999px] h-0 w-0 overflow-hidden"
                >
                  <label>
                    Web (nevyplňuj):
                    <input
                      type="text"
                      name="website"
                      tabIndex={-1}
                      autoComplete="off"
                    />
                  </label>
                </div>

                <fieldset>
                  <legend className="mb-2 text-sm font-medium text-zinc-800">
                    O co jde?
                  </legend>
                  <div className="space-y-2">
                    {CATEGORY_ORDER.map((cat) => (
                      <label
                        key={cat}
                        className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700"
                      >
                        <input
                          type="radio"
                          name="category"
                          value={cat}
                          required
                          className="text-emerald-600 focus:ring-emerald-600"
                        />
                        {REPORT_CATEGORY_LABEL[cat]}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div>
                  <label
                    htmlFor="report-note"
                    className="mb-1 block text-sm font-medium text-zinc-800"
                  >
                    Poznámka{" "}
                    <span className="text-xs font-normal text-zinc-500">
                      (volitelné, max {MAX_NOTE_LENGTH} znaků)
                    </span>
                  </label>
                  <textarea
                    id="report-note"
                    name="note"
                    rows={3}
                    maxLength={MAX_NOTE_LENGTH}
                    className="w-full rounded border border-zinc-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    placeholder="Třeba „útulna v září 2025 spadlá“…"
                  />
                </div>

                <div>
                  <label
                    htmlFor="report-email"
                    className="mb-1 block text-sm font-medium text-zinc-800"
                  >
                    Tvůj e-mail{" "}
                    <span className="text-xs font-normal text-zinc-500">
                      (volitelné, pokud chceš odpověď)
                    </span>
                  </label>
                  <input
                    id="report-email"
                    name="contactEmail"
                    type="email"
                    autoComplete="email"
                    className="w-full max-w-md rounded border border-zinc-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    placeholder="ty@example.cz"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    Odeslat
                  </button>
                  <span className="text-xs text-zinc-500">
                    Bez registrace. Tvůj e-mail nezveřejníme.
                  </span>
                </div>
              </form>
            </>
          )}
        </div>
      </details>
    </section>
  );
}
