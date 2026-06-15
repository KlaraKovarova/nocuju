import Link from "next/link";

import { sourceEnum, surfaceEnum } from "@/db/schema";

export type PlaceFormInitial = {
  id: number | null;
  name: string;
  slug: string;
  description: string;
  city: string;
  region: string;
  lat: string;
  lng: string;
  elevationM: string;
  sleeps: string;
  surface: string;
  hasWc: boolean;
  isFree: boolean;
  source: string;
  sourceUrl: string;
  categorySlugs: string[];
  amenitySlugs: string[];
  imagesText: string;
};

export type PlaceFormOption = { slug: string; label: string };

const SURFACE_LABEL: Record<string, string> = {
  kamenna: "Kamenná",
  drevena: "Dřevěná",
  hlinena: "Hliněná",
  trava: "Travnatá",
  mix: "Smíšená",
};

const SOURCE_LABEL: Record<string, string> = {
  "boudy.info": "boudy.info",
  viaczechia: "viaczechia.cz",
  manual: "Vlastní záznam",
};

export function emptyPlaceForm(): PlaceFormInitial {
  return {
    id: null,
    name: "",
    slug: "",
    description: "",
    city: "",
    region: "",
    lat: "",
    lng: "",
    elevationM: "",
    sleeps: "",
    surface: "",
    hasWc: false,
    isFree: true,
    source: "manual",
    sourceUrl: "",
    categorySlugs: [],
    amenitySlugs: [],
    imagesText: "",
  };
}

export function PlaceForm({
  initial,
  categoryOptions,
  amenityOptions,
  submitUrl,
  deleteUrl,
  errorMessage,
  successMessage,
}: {
  initial: PlaceFormInitial;
  categoryOptions: PlaceFormOption[];
  amenityOptions: PlaceFormOption[];
  submitUrl: string;
  deleteUrl?: string | null;
  errorMessage?: string | null;
  successMessage?: string | null;
}) {
  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {errorMessage}
        </div>
      )}

      <form method="POST" action={submitUrl} className="space-y-8">
        <Section title="Základ">
          <Grid>
            <Field label="Název" required>
              <input
                name="name"
                defaultValue={initial.name}
                required
                className={inputClass}
              />
            </Field>
            <Field
              label="Slug"
              hint="Volitelné. Pokud necháš prázdné, vygeneruje se z názvu."
            >
              <input
                name="slug"
                defaultValue={initial.slug}
                className={inputClass}
                placeholder="utulna-pod-smrkem-jizerske-hory"
              />
            </Field>
          </Grid>
          <Field label="Popis (Markdown)">
            <textarea
              name="description"
              defaultValue={initial.description}
              rows={8}
              className={`${inputClass} font-mono text-xs`}
              placeholder="Krátký popis útulny / nocoviště. Podporuje Markdown."
            />
          </Field>
        </Section>

        <Section title="Poloha">
          <Grid>
            <Field label="Město / obec">
              <input
                name="city"
                defaultValue={initial.city}
                className={inputClass}
              />
            </Field>
            <Field label="Kraj">
              <input
                name="region"
                defaultValue={initial.region}
                className={inputClass}
              />
            </Field>
          </Grid>
          <Grid cols={3}>
            <Field label="Šířka (lat)" required>
              <input
                name="lat"
                defaultValue={initial.lat}
                required
                inputMode="decimal"
                className={inputClass}
                placeholder="50.0612"
              />
            </Field>
            <Field label="Délka (lng)" required>
              <input
                name="lng"
                defaultValue={initial.lng}
                required
                inputMode="decimal"
                className={inputClass}
                placeholder="14.4321"
              />
            </Field>
            <Field label="Nadm. výška (m)">
              <input
                name="elevationM"
                defaultValue={initial.elevationM}
                type="number"
                className={inputClass}
              />
            </Field>
          </Grid>
        </Section>

        <Section title="Vlastnosti">
          <Grid cols={3}>
            <Field label="Lůžek / míst">
              <input
                name="sleeps"
                defaultValue={initial.sleeps}
                type="number"
                min={0}
                className={inputClass}
              />
            </Field>
            <Field label="Povrch">
              <select
                name="surface"
                defaultValue={initial.surface}
                className={inputClass}
              >
                <option value="">—</option>
                {surfaceEnum.map((value) => (
                  <option key={value} value={value}>
                    {SURFACE_LABEL[value] ?? value}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Zdroj">
              <select
                name="source"
                defaultValue={initial.source}
                className={inputClass}
              >
                {sourceEnum.map((value) => (
                  <option key={value} value={value}>
                    {SOURCE_LABEL[value] ?? value}
                  </option>
                ))}
              </select>
            </Field>
          </Grid>
          <Grid>
            <CheckboxField
              name="hasWc"
              label="Má WC"
              defaultChecked={initial.hasWc}
            />
            <CheckboxField
              name="isFree"
              label="Zdarma (free to use)"
              defaultChecked={initial.isFree}
            />
          </Grid>
          <Field label="Odkaz na zdroj (URL)">
            <input
              name="sourceUrl"
              defaultValue={initial.sourceUrl}
              type="url"
              className={inputClass}
              placeholder="https://…"
            />
          </Field>
        </Section>

        <Section title="Kategorie">
          <CheckboxGroup
            name="categories"
            options={categoryOptions}
            selected={initial.categorySlugs}
          />
        </Section>

        <Section title="Vybavení">
          <CheckboxGroup
            name="amenities"
            options={amenityOptions}
            selected={initial.amenitySlugs}
          />
        </Section>

        <Section
          title="Obrázky"
          hint="Jeden URL na řádek. Volitelně `URL | popisek`."
        >
          <textarea
            name="images"
            defaultValue={initial.imagesText}
            rows={5}
            className={`${inputClass} font-mono text-xs`}
            placeholder={"https://…/hero.jpg | Vnější pohled\nhttps://…/interior.jpg"}
          />
        </Section>

        <div className="flex flex-wrap items-center gap-3 border-t border-zinc-200 pt-6">
          <button
            type="submit"
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            {initial.id ? "Uložit změny" : "Vytvořit místo"}
          </button>
          <Link
            href="/admin/places"
            className="text-sm text-zinc-600 hover:text-zinc-900"
          >
            Zpět na seznam
          </Link>
          {initial.id && initial.slug ? (
            <Link
              href={`/misto/${initial.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-sm text-zinc-600 hover:text-emerald-700"
            >
              Zobrazit veřejně ↗
            </Link>
          ) : null}
        </div>
      </form>

      {initial.id && deleteUrl ? (
        <form
          method="POST"
          action={deleteUrl}
          className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <div className="flex items-center justify-between gap-3">
            <span>Smazat toto místo. Akce je nevratná.</span>
            <button
              type="submit"
              className="rounded bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
            >
              Smazat
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

const inputClass =
  "block w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600";

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded border border-zinc-200 bg-white p-5">
      <header className="mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-700">
          {title}
        </h2>
        {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Grid({
  cols = 2,
  children,
}: {
  cols?: 2 | 3;
  children: React.ReactNode;
}) {
  const cls = cols === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2";
  return <div className={`grid gap-4 ${cls}`}>{children}</div>;
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-zinc-700">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </span>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </label>
  );
}

function CheckboxField({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-center gap-2 rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-zinc-400 text-emerald-600 focus:ring-emerald-600"
      />
      {label}
    </label>
  );
}

function CheckboxGroup({
  name,
  options,
  selected,
}: {
  name: string;
  options: PlaceFormOption[];
  selected: string[];
}) {
  if (options.length === 0) {
    return <p className="text-sm text-zinc-500">Žádné položky.</p>;
  }
  const selectedSet = new Set(selected);
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {options.map((opt) => (
        <label
          key={opt.slug}
          className="flex items-center gap-2 rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800"
        >
          <input
            type="checkbox"
            name={name}
            value={opt.slug}
            defaultChecked={selectedSet.has(opt.slug)}
            className="h-4 w-4 rounded border-zinc-400 text-emerald-600 focus:ring-emerald-600"
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}
