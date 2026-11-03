import type { MetadataRoute } from "next";

function siteUrl(): string | undefined {
  const value = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) return undefined;
    return url.origin;
  } catch { return undefined; }
}

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/about", "/chapters", "/contact", "/events", "/help", "/media", "/rankings", "/results"],
      disallow: [
        "/admin", "/api", "/app", "/arena-live", "/auth/action", "/change-email",
        "/console", "/forgot-password", "/hq", "/invite", "/local", "/offline",
        "/preview", "/sign-in", "/sign-up", "/staff-invitations", "/v1", "/verify-email", "/workspaces",
      ],
    },
    ...(base ? { sitemap: `${base}/sitemap.xml` } : {}),
  };
}
