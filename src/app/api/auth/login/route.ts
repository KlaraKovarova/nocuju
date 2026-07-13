import { eq } from "drizzle-orm";
import { type NextRequest, type NextResponse } from "next/server";

import { db } from "@/db/client";
import { users } from "@/db/schema";
import { seeOther } from "@/lib/redirects";
import { MAX_EMAIL_LENGTH } from "@/lib/reports";
import {
  buildUserSessionCookie,
  sanitizeNextPath,
  signUserSession,
  verifyPassword,
} from "@/lib/user-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function backToForm(next: string, email: string): NextResponse {
  const query = new URLSearchParams({
    error: "Nesprávný e-mail nebo heslo.",
    email,
  });
  if (next !== "/") query.set("next", next);
  return seeOther(`/ucet/prihlaseni?${query}`);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const next = sanitizeNextPath(String(form.get("next") ?? ""));

  if (!email || email.length > MAX_EMAIL_LENGTH || !password) {
    return backToForm(next, email);
  }

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  const user = rows[0];

  // Accounts without a password hash (reserved for future magic-link auth)
  // can't sign in with a password; same generic error, no account oracle.
  if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    return backToForm(next, email);
  }

  const token = await signUserSession({
    id: Number(user.id),
    email: user.email,
    displayName: user.displayName ?? null,
  });
  const response = seeOther(next);
  response.cookies.set(buildUserSessionCookie(token));
  return response;
}
