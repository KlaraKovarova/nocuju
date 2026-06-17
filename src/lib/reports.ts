import { createHash } from "node:crypto";

import { reportCategoryEnum } from "@/db/schema";

export const MAX_NOTE_LENGTH = 500;
export const MAX_EMAIL_LENGTH = 254;
export const MAX_REPORTS_PER_IP_PER_DAY = 20;

export type ReportCategory = (typeof reportCategoryEnum)[number];

const CATEGORY_SET = new Set<string>(reportCategoryEnum);

export function isReportCategory(value: unknown): value is ReportCategory {
  return typeof value === "string" && CATEGORY_SET.has(value);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return value.length <= MAX_EMAIL_LENGTH && EMAIL_RE.test(value);
}

export function hashIp(ip: string): string {
  const salt = process.env.REPORT_IP_SALT ?? "noc-report-fallback-salt";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export function extractIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip") ?? "unknown";
}

export const REPORT_CATEGORY_LABEL: Record<ReportCategory, string> = {
  "info-nesedi": "Info nesedí",
  "nema-ho-tam": "Místo už neexistuje",
  nebezpecne: "Nebezpečné",
  jine: "Jiné",
};
