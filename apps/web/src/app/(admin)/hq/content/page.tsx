"use client";

import { useState } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status, Button, StatCard } from "@/components/ui";

export default function GlobalContentPublishingPage() {
  const [items, setItems] = useState([
    {
      id: "pub-01",
      section: "Global Homepage Hero",
      title: "One Floor. Every Possibility. World Finals Sydney 2027",
      target: "All Visitors",
      status: "Active Live",
      lastUpdated: "2026-10-30",
      tone: "volt" as const,
    },
    {
      id: "pub-02",
      section: "Featured Press Release",
      title: "Afterhours Collective Crowned Manila Session 2027 Champions",
      target: "Media Hub & News",
      status: "Active Live",
      lastUpdated: "2026-10-29",
      tone: "volt" as const,
    },
    {
      id: "pub-03",
      section: "Global Rulebook Document",
      title: "Edition 2026/27 v4.2 PDF Release with Scrutineer Notes",
      target: "Public & Portals",
      status: "Published",
      lastUpdated: "2026-10-15",
      tone: "volt" as const,
    },
    {
      id: "pub-04",
      section: "Partner Spotlight Bar",
      title: "Monster Energy & Destination NSW Global Activation",
      target: "Marketing Pages",
      status: "Scheduled",
      lastUpdated: "2026-11-01",
      tone: "amber" as const,
    },
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeading
          eyebrow="Global Editorial & Communications"
          title="Master Content & Publishing Engine"
          description="Control worldwide editorial campaigns, hero carousel spotlights, official rulebook releases, and corporate partner visibility."
        />
        <div className="flex gap-2">
          <Link href="/hq" className="button button-secondary" style={{ minHeight: "48px" }}>
            HQ Overview <Arrow diagonal />
          </Link>
          <Button
            variant="primary"
            onClick={() => alert("Creating new global content release draft...")}
            style={{ minHeight: "48px" }}
          >
            Create Global Release
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Live Releases" value="3 Active" meta="Synced worldwide" tone="volt" />
        <StatCard label="Scheduled Drops" value="1 Release" meta="Nov 1 Activation" tone="amber" />
        <StatCard label="Global Media CDN" value="Cloudflare Edge" meta="45ms Global TTFB" tone="volt" />
        <StatCard label="Translations" value="En / Ja / Es" meta="Multi-locale ready" />
      </div>

      <div className="panel bg-carbon border border-subtle overflow-x-auto rounded-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-subtle text-xs mono text-titanium">
              <th className="p-4">Publishing Slot</th>
              <th className="p-4">Content Title</th>
              <th className="p-4">Audience Target</th>
              <th className="p-4">Last Updated</th>
              <th className="p-4">State</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-subtle">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-subtle/30 transition-colors">
                <td className="p-4 mono text-xs font-bold text-volt">{item.section}</td>
                <td className="p-4 font-bold text-chrome">{item.title}</td>
                <td className="p-4 text-xs text-titanium">{item.target}</td>
                <td className="p-4 mono text-xs text-titanium">{item.lastUpdated}</td>
                <td className="p-4">
                  <Status tone={item.tone}>{item.status}</Status>
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => alert(`Editing ${item.section}`)}
                    className="button button-ghost text-xs"
                  >
                    Edit Draft
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
