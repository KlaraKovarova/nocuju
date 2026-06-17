import { randomUUID } from "node:crypto";

import { db } from "@/db/client";
import { analyticsEvents, uaClassEnum } from "@/db/schema";

export const ANALYTICS_COOKIE = "noc_s";
export const ANALYTICS_COOKIE_MAX_AGE = 60 * 30; // 30 minutes — counts each visit as a session

export type UaClass = (typeof uaClassEnum)[number];

const BOT_PATTERN =
  /(bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|preview|monitor|uptime|pingdom|lighthouse|headless|curl|wget|httpclient|axios|python-requests)/i;
const MOBILE_PATTERN = /(android|iphone|ipod|mobile|opera mini|iemobile|silk)/i;

export function classifyUserAgent(ua: string | null | undefined): UaClass {
  if (!ua) return "other";
  if (BOT_PATTERN.test(ua)) return "bot";
  if (MOBILE_PATTERN.test(ua)) return "mobile";
  return "desktop";
}

export function newSessionId(): string {
  return randomUUID().replace(/-/g, "");
}

export function extractReferrerHost(referrer: string | null | undefined): string | null {
  if (!referrer) return null;
  try {
    const url = new URL(referrer);
    return url.hostname.slice(0, 255);
  } catch {
    return null;
  }
}

export type RecordPageviewInput = {
  path: string;
  referrer: string | null | undefined;
  userAgent: string | null | undefined;
  sessionId: string;
};

export async function recordPageview(input: RecordPageviewInput): Promise<void> {
  const path = input.path.slice(0, 512);
  const referrerHost = extractReferrerHost(input.referrer);
  const uaClass = classifyUserAgent(input.userAgent);

  try {
    await db.insert(analyticsEvents).values({
      path,
      referrerHost,
      uaClass,
      sessionId: input.sessionId,
    });
  } catch (error) {
    console.error("[analytics] failed to record pageview", {
      path,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export function shouldTrackPath(pathname: string): boolean {
  if (pathname.startsWith("/admin")) return false;
  if (pathname.startsWith("/api")) return false;
  if (pathname.startsWith("/_next")) return false;
  if (pathname === "/favicon.ico") return false;
  if (pathname === "/robots.txt" || pathname === "/sitemap.xml") return false;
  if (pathname.includes(".")) return false; // static assets, .png, .map, etc.
  return true;
}
