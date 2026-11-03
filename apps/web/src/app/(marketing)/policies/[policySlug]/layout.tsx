import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Policy information",
  robots: { index: false, follow: true },
};

export default function PolicyLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
