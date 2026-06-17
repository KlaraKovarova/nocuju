import { and, eq, gte, sql } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { db } from "@/db/client";
import { placeReports, places } from "@/db/schema";
import {
  MAX_EMAIL_LENGTH,
  MAX_NOTE_LENGTH,
  MAX_REPORTS_PER_IP_PER_DAY,
  extractIp,
  hashIp,
  isReportCategory,
  isValidEmail,
} from "@/lib/reports";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type FieldName = "placeId" | "category" | "note" | "contactEmail" | "honeypot";

function jsonError(status: number, field: FieldName | null, message: string) {
  return NextResponse.json({ ok: false, field, message }, { status });
}

function redirectWithError(
  request: NextRequest,
  slug: string | null,
  message: string,
): NextResponse {
  const url = new URL(slug ? `/misto/${slug}` : "/", request.url);
  url.searchParams.set("reportError", message);
  url.hash = "nahlasit";
  return NextResponse.redirect(url, 303);
}

function redirectWithSuccess(request: NextRequest, slug: string): NextResponse {
  const url = new URL(`/misto/${slug}`, request.url);
  url.searchParams.set("reportSent", "1");
  url.hash = "nahlasit";
  return NextResponse.redirect(url, 303);
}

type FormBody = {
  placeId: number;
  slug: string | null;
  category: string;
  note: string;
  contactEmail: string;
  honeypot: string;
};

async function readBody(request: NextRequest): Promise<{
  body: FormBody;
  isJson: boolean;
} | null> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const json = (await request.json()) as Record<string, unknown>;
      return {
        isJson: true,
        body: {
          placeId: Number(json.placeId),
          slug: typeof json.slug === "string" ? json.slug : null,
          category: String(json.category ?? ""),
          note: String(json.note ?? ""),
          contactEmail: String(json.contactEmail ?? ""),
          honeypot: String(json.website ?? ""),
        },
      };
    } catch {
      return null;
    }
  }
  const form = await request.formData();
  return {
    isJson: false,
    body: {
      placeId: Number(form.get("placeId")),
      slug: typeof form.get("slug") === "string" ? String(form.get("slug")) : null,
      category: String(form.get("category") ?? ""),
      note: String(form.get("note") ?? ""),
      contactEmail: String(form.get("contactEmail") ?? ""),
      honeypot: String(form.get("website") ?? ""),
    },
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const parsed = await readBody(request);
  if (!parsed) return jsonError(400, null, "Neplatný požadavek.");
  const { body, isJson } = parsed;

  // Honeypot — silently accept and bail.
  if (body.honeypot.trim().length > 0) {
    if (isJson) return NextResponse.json({ ok: true });
    if (body.slug) return redirectWithSuccess(request, body.slug);
    return NextResponse.json({ ok: true });
  }

  if (!Number.isFinite(body.placeId) || body.placeId <= 0) {
    if (isJson) return jsonError(400, "placeId", "Neplatné místo.");
    return redirectWithError(request, body.slug, "Neplatné místo.");
  }

  if (!isReportCategory(body.category)) {
    if (isJson) return jsonError(400, "category", "Vyber kategorii.");
    return redirectWithError(request, body.slug, "Vyber kategorii.");
  }

  const note = body.note.trim();
  if (note.length > MAX_NOTE_LENGTH) {
    if (isJson) return jsonError(400, "note", "Poznámka je moc dlouhá.");
    return redirectWithError(request, body.slug, "Poznámka je moc dlouhá.");
  }

  const email = body.contactEmail.trim();
  if (email.length > 0) {
    if (email.length > MAX_EMAIL_LENGTH || !isValidEmail(email)) {
      if (isJson) return jsonError(400, "contactEmail", "Neplatný e-mail.");
      return redirectWithError(request, body.slug, "Neplatný e-mail.");
    }
  }

  const placeRow = (
    await db
      .select({ id: places.id, slug: places.slug })
      .from(places)
      .where(eq(places.id, body.placeId))
      .limit(1)
  )[0];
  if (!placeRow) {
    if (isJson) return jsonError(404, "placeId", "Místo nenalezeno.");
    return redirectWithError(request, body.slug, "Místo nenalezeno.");
  }

  const ip = extractIp(request.headers);
  const ipHash = hashIp(ip);

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [{ count }] = (await db
    .select({ count: sql<number>`count(*)` })
    .from(placeReports)
    .where(
      and(
        eq(placeReports.sourceIpHash, ipHash),
        gte(placeReports.createdAt, since),
      ),
    )) as Array<{ count: number }>;
  if (Number(count) >= MAX_REPORTS_PER_IP_PER_DAY) {
    if (isJson)
      return jsonError(429, null, "Zkoušíš to moc často. Zkus to později.");
    return redirectWithError(
      request,
      placeRow.slug,
      "Zkoušíš to moc často. Zkus to později.",
    );
  }

  await db.insert(placeReports).values({
    placeId: Number(placeRow.id),
    category: body.category,
    note: note.length > 0 ? note : null,
    contactEmail: email.length > 0 ? email : null,
    sourceIpHash: ipHash,
  });

  if (isJson) return NextResponse.json({ ok: true });
  return redirectWithSuccess(request, placeRow.slug);
}
