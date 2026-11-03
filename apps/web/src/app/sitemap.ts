import type { MetadataRoute } from "next";

function siteUrl(): URL | undefined {
  const value = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) return undefined;
    return new URL(url.origin);
  } catch { return undefined; }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  if (!base) return [];
  return ["/", "/about", "/chapters", "/contact", "/events", "/help", "/media", "/results"]
    .map(path => ({ url: new URL(path, base).toString() }));
}
