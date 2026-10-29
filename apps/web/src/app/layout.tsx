import type { Metadata } from "next";
import "./theme.css";
import "./hero-motion.css";
import "@fontsource/archivo-black/latin-400.css";
import "@fontsource-variable/geist";
import "@fontsource-variable/jetbrains-mono";
export const metadata: Metadata = { title: "World Supremacy Battlegrounds", description: "The home of the next generation of street dance competition." };
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className="dark" data-theme="dark"><body><a href="#main-content" className="skip-link">Skip to content</a>{children}</body></html>;
}
