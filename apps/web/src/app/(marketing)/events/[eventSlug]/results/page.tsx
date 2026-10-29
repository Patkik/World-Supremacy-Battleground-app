"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status, Button, StatCard } from "@/components/ui";

export default function EventOfficialResultsPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = use(params);

  const [activeDivision, setActiveDivision] = useState("Open Crew");

  const divisions = ["Open Crew", "Monster Crew", "Young Guns", "Varsity"];

  const results = [
    {
      rank: 1,
      entryId: "entry-manila-open-1",
      number: "014",
      crew: "Afterhours Collective",
      city: "Manila, Philippines",
      totalScore: "88.33",
      deduction: "0.0",
      advancement: "Worlds Qualified (Seed #1)",
      status: "Official Certified",
      tone: "volt" as const,
    },
    {
      rank: 2,
      entryId: "entry-manila-open-2",
      number: "015",
      crew: "Alliance Project",
      city: "Cebu, Philippines",
      totalScore: "87.17",
      deduction: "0.0",
      advancement: "Worlds Qualified (Seed #2)",
      status: "Official Certified",
      tone: "volt" as const,
    },
    {
      rank: 3,
      entryId: "entry-manila-open-3",
      number: "012",
      crew: "Legion X",
      city: "Quezon City, Philippines",
      totalScore: "85.00",
      deduction: "-0.5 (Time)",
      advancement: "Worlds Qualified (Seed #3)",
      status: "Official Certified",
      tone: "amber" as const,
    },
    {
      rank: 4,
      entryId: "entry-manila-open-4",
      number: "009",
      crew: "The Council",
      city: "Davao, Philippines",
      totalScore: "84.00",
      deduction: "0.0",
      advancement: "Alternate Reserve",
      status: "Official Certified",
      tone: "neutral" as const,
    },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeading
          eyebrow="Certified Outcome"
          title={`${eventSlug.replace(/-/g, " ").toUpperCase()} · Official Results`}
          description="Official published scores, division podiums, and World Championship qualification allocations. Verified under Olympic trimmed mean protocol."
        />
        <div className="flex gap-2">
          <Link
            href={`/events/${eventSlug}/schedule`}
            className="button button-secondary"
            style={{ minHeight: "48px" }}
          >
            Stage Schedule <Arrow diagonal />
          </Link>
          <Link
            href={`/events/${eventSlug}/live`}
            className="button button-secondary"
            style={{ minHeight: "48px" }}
          >
            Live Hub <Arrow diagonal />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Division Champion" value="Afterhours (88.33)" meta="Open Crew" tone="volt" />
        <StatCard label="Advancement Quota" value="Top 3 Qualify" meta="Sydney World Finals" tone="volt" />
        <StatCard label="Scrutineer Seal" value="Certified" meta="Zero discrepancies" />
        <StatCard label="Revision State" value="Rev 1.0 (Official)" meta="Immutable digest" />
      </div>

      {/* DIVISION SELECTOR TABS */}
      <div className="flex flex-wrap gap-2 border-b border-subtle pb-4">
        {divisions.map((d) => (
          <Button
            key={d}
            variant={activeDivision === d ? "primary" : "secondary"}
            onClick={() => setActiveDivision(d)}
            style={{ minHeight: "44px" }}
          >
            {d} Division
          </Button>
        ))}
      </div>

      {/* LEADERBOARD TABLE */}
      <div className="panel bg-carbon border border-subtle overflow-x-auto rounded-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-subtle text-xs mono text-titanium">
              <th className="p-4">Rank</th>
              <th className="p-4">Entry</th>
              <th className="p-4">Crew & City</th>
              <th className="p-4">Technical Deductions</th>
              <th className="p-4">Official Total</th>
              <th className="p-4">World Finals Advancement</th>
              <th className="p-4 text-right">Scorecard</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-subtle">
            {results.map((res) => (
              <tr key={res.entryId} className="hover:bg-subtle/30 transition-colors">
                <td className="p-4 mono font-extrabold text-2xl text-volt">#{res.rank}</td>
                <td className="p-4 mono text-white">Entry {res.number}</td>
                <td className="p-4">
                  <strong className="block text-chrome text-lg">{res.crew}</strong>
                  <span className="text-xs text-titanium">{res.city}</span>
                </td>
                <td className="p-4 mono text-xs text-crimson font-medium">{res.deduction}</td>
                <td className="p-4 mono font-black text-2xl text-white">{res.totalScore}</td>
                <td className="p-4">
                  <span className={`badge ${res.rank <= 3 ? "badge-volt" : "badge-neutral"} text-xs mono`}>
                    {res.advancement}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <Link
                    href={`/events/${eventSlug}/results/${res.entryId}`}
                    className="button button-ghost text-xs"
                    style={{ minHeight: "38px" }}
                  >
                    Inspect Breakdown <Arrow />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center text-xs text-titanium pt-2 border-t border-subtle">
        <span>Scoring calculation: 3-judge panel trimmed mean minus technical deductions.</span>
        <Link href="/results" className="text-link">
          All Event Results <Arrow diagonal />
        </Link>
      </div>
    </div>
  );
}
