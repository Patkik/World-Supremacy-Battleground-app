import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Event information",
  description: "Event details are indexed only after an organizer publishes them.",
  robots: { index: false, follow: true },
};

export default function EventLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
