const DEFAULT_SITE_URL = "https://nocuju.cz";

function trimTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function getSiteUrl(): string {
  const raw = process.env.SITE_URL?.trim();
  if (raw && /^https?:\/\//.test(raw)) return trimTrailingSlash(raw);
  return DEFAULT_SITE_URL;
}

export function isProductionCrawlable(): boolean {
  if (process.env.SITE_ALLOW_CRAWL === "true") return true;
  if (process.env.SITE_ALLOW_CRAWL === "false") return false;
  return process.env.NODE_ENV === "production";
}
