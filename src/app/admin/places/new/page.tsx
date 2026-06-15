import { asc } from "drizzle-orm";

import { db } from "@/db/client";
import { amenities, categories } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";

import { AdminShell } from "../../_components/AdminShell";
import {
  PlaceForm,
  emptyPlaceForm,
  type PlaceFormOption,
} from "../_components/PlaceForm";

export const dynamic = "force-dynamic";

async function loadTaxonomy(): Promise<{
  categoryOptions: PlaceFormOption[];
  amenityOptions: PlaceFormOption[];
}> {
  const [categoryRows, amenityRows] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.name)),
    db.select().from(amenities).orderBy(asc(amenities.label)),
  ]);
  return {
    categoryOptions: categoryRows.map((r) => ({ slug: r.slug, label: r.name })),
    amenityOptions: amenityRows.map((r) => ({ slug: r.slug, label: r.label })),
  };
}

export default async function NewPlacePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const errorRaw = Array.isArray(sp.error) ? sp.error[0] : sp.error;
  const errorMessage = errorRaw ? decodeURIComponent(errorRaw) : null;

  const { categoryOptions, amenityOptions } = await loadTaxonomy();

  return (
    <AdminShell title="Nové místo">
      <PlaceForm
        initial={emptyPlaceForm()}
        categoryOptions={categoryOptions}
        amenityOptions={amenityOptions}
        submitUrl="/api/admin/places"
        errorMessage={errorMessage}
      />
    </AdminShell>
  );
}
