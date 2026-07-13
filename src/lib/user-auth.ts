import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";

import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";

// promisify() loses the options-taking overload of crypto.scrypt.
function scrypt(
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keylen, options, (err, derivedKey) =>
      err ? reject(err) : resolve(derivedKey),
    );
  });
}

export const USER_COOKIE = "user_session";
const ALG = "HS256";
// Distinct issuer keeps user tokens from ever validating as admin sessions
// (admin-auth uses issuer "noc-admin" with the same ADMIN_SESSION_SECRET,
// which is already provisioned on the box — no new env var needed).
const ISSUER = "noc-user";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 200;

const SCRYPT_KEYLEN = 64;
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;

export type SessionUser = {
  id: number;
  email: string;
  displayName: string | null;
};

function getSecretKey(): Uint8Array {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "ADMIN_SESSION_SECRET must be set to a random string of at least 16 chars",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = (await scrypt(password, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  }));
  return [
    "scrypt",
    String(SCRYPT_N),
    String(SCRYPT_R),
    String(SCRYPT_P),
    salt.toString("base64"),
    hash.toString("base64"),
  ].join(":");
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (![n, r, p].every((v) => Number.isInteger(v) && v > 0)) return false;

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(parts[4], "base64");
    expected = Buffer.from(parts[5], "base64");
  } catch {
    return false;
  }
  if (expected.length === 0) return false;

  try {
    const actual = (await scrypt(password, salt, expected.length, {
      N: n,
      r,
      p,
    }));
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export async function signUserSession(user: SessionUser): Promise<string> {
  return new SignJWT({
    email: user.email,
    name: user.displayName ?? undefined,
  })
    .setProtectedHeader({ alg: ALG })
    .setSubject(String(user.id))
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifyUserToken(
  token: string,
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      issuer: ISSUER,
    });
    const id = Number(payload.sub);
    const email = typeof payload.email === "string" ? payload.email : null;
    if (!Number.isInteger(id) || id <= 0 || !email) return null;
    return {
      id,
      email,
      displayName: typeof payload.name === "string" ? payload.name : null,
    };
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(USER_COOKIE)?.value;
  if (!token) return null;
  return verifyUserToken(token);
}

export function buildUserSessionCookie(token: string) {
  return {
    name: USER_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

export function clearUserSessionCookie() {
  return {
    name: USER_COOKIE,
    value: "",
    path: "/",
    maxAge: 0,
  };
}

// Redirect targets from form fields must stay on-site: require a leading "/"
// and reject protocol-relative ("//…") or backslash-smuggled values.
export function sanitizeNextPath(value: string | null, fallback = "/"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value.includes("\\")) return fallback;
  const url = new URL(value, "http://sanitize.invalid");
  if (url.origin !== "http://sanitize.invalid") return fallback;
  const path = url.pathname + url.search + url.hash;
  return path.startsWith("/") && !path.startsWith("//") ? path : fallback;
}
