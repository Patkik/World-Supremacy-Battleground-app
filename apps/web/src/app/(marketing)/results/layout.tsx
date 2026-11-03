import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Published results",
  description: "Open event results after authorized event staff publish a division.",
  alternates: { canonical: "/results" },
};

export default function ResultsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
