import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Public crew profile",
  robots: { index: false, follow: true },
};

export default function CrewProfileLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
