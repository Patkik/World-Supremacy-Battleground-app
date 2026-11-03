import type { Metadata } from "next";
import "./theme.css";
import "@fontsource/archivo-black/latin-400.css";
import "@fontsource-variable/geist";
import "@fontsource-variable/jetbrains-mono";
import { SkipLink } from "@/components/skip-link";

function siteBaseUrl(): URL | undefined {
  const value = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) return undefined;
    return new URL(url.origin);
  } catch { return undefined; }
}

const metadataBase = siteBaseUrl();
export const metadata: Metadata = {
  ...(metadataBase ? { metadataBase } : {}),
  robots: { index: false, follow: true },
  title: { default: "World Supremacy Battlegrounds", template: "%s | WSB" },
  description: "World Supremacy Battlegrounds brings street dance crews, chapters and competition operations together.",
  applicationName: "World Supremacy Battlegrounds",
  openGraph: {
    type: "website",
    siteName: "World Supremacy Battlegrounds",
    title: "World Supremacy Battlegrounds",
    description: "Street dance crews, chapters and competition operations, together.",
  },
  twitter: {
    card: "summary_large_image",
    title: "World Supremacy Battlegrounds",
    description: "Street dance crews, chapters and competition operations, together.",
  },
};
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className="dark" data-theme="dark"><body><SkipLink />{children}</body></html>;
}
