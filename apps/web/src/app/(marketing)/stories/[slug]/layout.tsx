import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "WSB stories",
  robots: { index: false, follow: true },
};

export default function StoryLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
