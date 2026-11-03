import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "World Supremacy Battlegrounds",
    short_name: "WSB",
    description: "Crew and competition workspace",
    start_url: "/workspaces",
    display: "standalone",
    background_color: "#070709",
    theme_color: "#070709",
    icons: [
      { src: "/brand/wsb-icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/wsb-icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/wsb-icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
