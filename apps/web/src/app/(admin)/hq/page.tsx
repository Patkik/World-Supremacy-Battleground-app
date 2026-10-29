"use client";

import Link from "next/link";
import { Arrow, PageHeading, Status, Button, StatCard } from "@/components/ui";

export default function GlobalHqOverviewPage() {
  const chapters = [
    { name: "Australia (Global HQ)", code: "AU", status: "Active", events: 4, director: "Marco Selorio", currency: "AUD" },
    { name: "Philippines", code: "PH", status: "Active", events: 3, director: "Marcus Vance", currency: "PHP" },
    { name: "Japan", code: "JPN", status: "Active", events: 2, director: "Kenjiro Takahashi", currency: "JPY" },
    { name: "New Zealand", code: "NZ", status: "Active", events: 2, director: "Tane Williams", currency: "NZD" },
    { name: "United States", code: "USA", status: "Expansion", events: 1, director: "David Cole", currency: "USD" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeading
          eyebrow="Global Command & Governance"
          title="World Supremacy Battlegrounds HQ"
          description="Master administrative console for international chapter licenses, rulebook standards, global staff access, and platform infrastructure."
        />
        <div className="flex gap-2">
          <Link href="/hq/chapters" className="button button-volt" style={{ minHeight: "48px" }}>
            Chapter Licenses <Arrow />
          </Link>
          <Link href="/hq/operations" className="button button-secondary" style={{ minHeight: "48px" }}>
            Platform Health <Arrow diagonal />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Global Chapters" value="18 Territories" meta="5 Continents" tone="volt" />
        <StatCard label="Active Season" value="2027 Season" meta="14 Qualifier Events" tone="volt" />
        <StatCard label="Accredited Dancers" value="14,820" meta="Worldwide Registry" />
        <StatCard label="Platform Core" value="Axum + Next.js" meta="Zero Outages" tone="volt" />
      </div>

      {/* HQ NAVIGATION TILES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { title: "Chapter Administration", path: "/hq/chapters", desc: "License renewals, currency assignments, territorial boundaries, and chapter director appointments." },
          { title: "Global Rulebook Library", path: "/hq/rules", desc: "5-criteria rubric weights, age/division limits, technical deduction definitions, and judging protocols." },
          { title: "Access & Role Governance", path: "/hq/access", desc: "Global RBAC, multi-factor authentication enforcement, international scrutineer credentials." },
          { title: "Global Content & Media", path: "/hq/content", desc: "Worldwide homepage features, press releases, partner spotlight slots, and editorial calendar." },
          { title: "Integration Services", path: "/hq/integrations", desc: "Stripe/Xendit merchant gateways, Firebase credentials, CDN distributions, and notification webhooks." },
          { title: "Platform Operations", path: "/hq/operations", desc: "Rust Axum API latencies, Firestore gRPC metrics, cold-start telemetry, and cryptographic audit proofs." },
        ].map((tile) => (
          <Link
            key={tile.path}
            href={tile.path}
            className="panel p-6 bg-carbon border border-subtle hover:border-volt transition-colors rounded-xl flex flex-col justify-between space-y-4 group"
          >
            <div>
              <h3 className="text-xl font-bold text-chrome group-hover:text-volt transition-colors">
                {tile.title}
              </h3>
              <p className="text-xs text-titanium mt-2 leading-relaxed">{tile.desc}</p>
            </div>
            <div className="flex items-center text-xs text-volt font-mono pt-4 border-t border-subtle">
              <span>MANAGE MODULE</span>
              <span className="ml-auto">→</span>
            </div>
          </Link>
        ))}
      </div>

      {/* ACTIVE CHAPTER STATUS */}
      <section className="panel p-6 bg-carbon border border-subtle rounded-xl space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-chrome">Key Regional Chapters</h3>
          <Link href="/hq/chapters" className="text-link text-xs mono">
            View All 18 Chapters <Arrow diagonal />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-subtle text-xs mono text-titanium">
                <th className="p-3">Territory</th>
                <th className="p-3">Director</th>
                <th className="p-3">Active Events</th>
                <th className="p-3">Currency</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle">
              {chapters.map((c) => (
                <tr key={c.code} className="hover:bg-subtle/30 transition-colors text-sm">
                  <td className="p-3 font-bold text-chrome">{c.name}</td>
                  <td className="p-3 text-titanium">{c.director}</td>
                  <td className="p-3 mono text-titanium">{c.events} Events</td>
                  <td className="p-3 mono text-volt">{c.currency}</td>
                  <td className="p-3">
                    <Status tone={c.status === "Active" ? "volt" : "amber"}>{c.status}</Status>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
