"use client";

import { useState } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status, Button, Select, Input, StatCard } from "@/components/ui";

export default function GlobalChapterAdministrationPage() {
  const [chapters, setChapters] = useState([
    {
      id: "ch-au",
      name: "Australia (Global HQ)",
      director: "Marco Selorio",
      email: "hq@worldsupremacybattlegrounds.com",
      currency: "AUD",
      quota: 4,
      expires: "2029-12-31",
      status: "Active",
      tone: "volt" as const,
    },
    {
      id: "ch-ph",
      name: "Philippines",
      director: "Marcus Vance",
      email: "philippines@wsbchampionships.com",
      currency: "PHP",
      quota: 3,
      expires: "2027-12-31",
      status: "Active",
      tone: "volt" as const,
    },
    {
      id: "ch-jpn",
      name: "Japan",
      director: "Kenjiro Takahashi",
      email: "japan@wsbchampionships.com",
      currency: "JPY",
      quota: 3,
      expires: "2027-10-31",
      status: "Active",
      tone: "volt" as const,
    },
    {
      id: "ch-nz",
      name: "New Zealand",
      director: "Tane Williams",
      email: "nz@wsbchampionships.com",
      currency: "NZD",
      quota: 2,
      expires: "2027-11-30",
      status: "Active",
      tone: "volt" as const,
    },
    {
      id: "ch-usa",
      name: "United States (West Coast)",
      director: "David Cole",
      email: "usa@wsbchampionships.com",
      currency: "USD",
      quota: 2,
      expires: "2026-12-31",
      status: "Renewal Due",
      tone: "amber" as const,
    },
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeading
          eyebrow="Global Governance & Licensing"
          title="International Chapter Administration"
          description="Grant regional operating licenses, configure localized minor currency units, and allocate World Championship national seeds."
        />
        <div className="flex gap-2">
          <Link href="/hq" className="button button-secondary" style={{ minHeight: "48px" }}>
            HQ Overview <Arrow diagonal />
          </Link>
          <Button
            variant="primary"
            onClick={() => alert("Launching Chapter License Provisioning Wizard...")}
            style={{ minHeight: "48px" }}
          >
            Issue New Chapter License
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Licensed Chapters" value={chapters.length.toString()} meta="Territories" tone="volt" />
        <StatCard label="Total World Seeds" value="14 Seeds" meta="Allocated for 2027" tone="volt" />
        <StatCard label="Renewal Required" value="1 Chapter" meta="USA (Dec 2026)" tone="amber" />
        <StatCard label="Currency Isolation" value="Enforced" meta="Server-side minor units" />
      </div>

      <div className="panel bg-carbon border border-subtle overflow-x-auto rounded-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-subtle text-xs mono text-titanium">
              <th className="p-4">Chapter Territory</th>
              <th className="p-4">Director</th>
              <th className="p-4">Contact</th>
              <th className="p-4">Currency</th>
              <th className="p-4">Worlds Quota</th>
              <th className="p-4">License Expiration</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-subtle">
            {chapters.map((c) => (
              <tr key={c.id} className="hover:bg-subtle/30 transition-colors">
                <td className="p-4 font-bold text-chrome">{c.name}</td>
                <td className="p-4 text-xs text-titanium">{c.director}</td>
                <td className="p-4 mono text-xs text-titanium">{c.email}</td>
                <td className="p-4 mono font-bold text-volt">{c.currency}</td>
                <td className="p-4 mono text-xs text-white">{c.quota} Seeds</td>
                <td className="p-4 mono text-xs text-titanium">{c.expires}</td>
                <td className="p-4">
                  <Status tone={c.tone}>{c.status}</Status>
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => alert(`Opening license configuration for ${c.name}`)}
                    className="button button-ghost text-xs"
                  >
                    Manage License
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
