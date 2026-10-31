import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return { name: "World Supremacy Battlegrounds", short_name: "WSB", description: "Crew and competition workspace", start_url: "/workspaces", display: "standalone", background_color: "#070709", theme_color: "#070709", icons: [{ src: "/brand/wsb-logo.png", sizes: "any", type: "image/png" }] };
}
