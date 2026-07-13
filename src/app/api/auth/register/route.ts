import { type NextRequest, type NextResponse } from "next/server";

import { db } from "@/db/client";
import { isDuplicateEntryError } from "@/db/errors";
import { users } from "@/db/schema";
import { seeOther } from "@/lib/redirects";
import { isValidEmail, MAX_EMAIL_LENGTH } from "@/lib/reports";
import {
  buildUserSessionCookie,
  hashPassword,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  sanitizeNextPath,
  signUserSession,
} from "@/lib/user-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_DISPLAY_NAME_LENGTH = 128;

function backToForm(next: string, email: string, error: string): NextResponse {
  const query = new URLSearchParams({ error, email });
  if (next !== "/") query.set("next", next);
  return seeOther(`/ucet/registrace?${query}`);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const displayName = String(form.get("displayName") ?? "").trim();
  const next = sanitizeNextPath(String(form.get("next") ?? ""));

  if (!email || email.length > MAX_EMAIL_LENGTH || !isValidEmail(email)) {
    return backToForm(next, email, "Zadej platný e-mail.");
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return backToForm(
      next,
      email,
      `Heslo musí mít aspoň ${MIN_PASSWORD_LENGTH} znaků.`,
    );
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return backToForm(next, email, "Heslo je moc dlouhé.");
  }
  if (displayName.length > MAX_DISPLAY_NAME_LENGTH) {
    return backToForm(next, email, "Jméno je moc dlouhé.");
  }

  const passwordHash = await hashPassword(password);
  let userId: number;
  try {
    const inserted = await db
      .insert(users)
      .values({
        email,
        displayName: displayName || null,
        passwordHash,
      })
      .$returningId();
    userId = Number(inserted[0].id);
  } catch (error) {
    if (isDuplicateEntryError(error)) {
      return backToForm(
        next,
        email,
        "Účet s tímhle e-mailem už existuje. Zkus se přihlásit.",
      );
    }
    throw error;
  }

  // Registrations created before password auth existed (NOC-93 left
  // password_hash nullable) can't happen via this route, so no backfill here.
  const token = await signUserSession({
    id: userId,
    email,
    displayName: displayName || null,
  });
  const response = seeOther(next);
  response.cookies.set(buildUserSessionCookie(token));
  return response;
}
