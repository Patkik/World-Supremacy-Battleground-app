"use client";

import { useState } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status, Button, Select, StatCard } from "@/components/ui";

export default function SeasonRankingsPage() {
  const [division, setDivision] = useState("Open Crew");
  const [season, setSeason] = useState("2027");

  const rankings = [
    {
      rank: 1,
      delta: "+2",
      crew: "Afterhours Collective",
      slug: "afterhours-collective",
      country: "Philippines",
      code: "PH",
      points: 1250,
      eventsWon: "Manila Session 2027 (88.33)",
      status: "World Seed #1",
      tone: "volt" as const,
    },
    {
      rank: 2,
      delta: "0",
      crew: "The Brotherhood AU",
      slug: "the-brotherhood-au",
      country: "Australia",
      code: "AU",
      points: 1180,
      eventsWon: "Sydney Qualifier 2026 (89.40)",
      status: "World Seed #2",
      tone: "volt" as const,
    },
    {
      rank: 3,
      delta: "+4",
      crew: "Alliance Project",
      slug: "alliance-project",
      country: "Philippines",
      code: "PH",
      points: 1040,
      eventsWon: "Manila Session 2nd (87.17)",
      status: "World Seed #3",
      tone: "volt" as const,
    },
    {
      rank: 4,
      delta: "-1",
      crew: "Found Nation Tokyo",
      slug: "found-nation-tokyo",
      country: "Japan",
      code: "JPN",
      points: 980,
      eventsWon: "Tokyo Winter Clash 2026",
      status: "Contender",
      tone: "neutral" as const,
    },
    {
      rank: 5,
      delta: "NEW",
      crew: "Legion X",
      slug: "legion-x",
      country: "Philippines",
      code: "PH",
      points: 920,
      eventsWon: "Manila Session 3rd (85.00)",
      status: "Contender",
      tone: "amber" as const,
    },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeading
          eyebrow="Global Championship Standings"
          title="World Rankings & Seed Tables"
          description="Official cumulative rankings determining seed placements, bye privileges, and direct invitations to the World Supremacy Battlegrounds World Finals in Sydney."
        />
        <div className="flex gap-2">
          <Link href="/results" className="button button-secondary" style={{ minHeight: "48px" }}>
            Event Results <Arrow diagonal />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="World Leader" value="Afterhours (PH)" meta="1,250 Points" tone="volt" />
        <StatCard label="Ranked Crews" value="142 Crews" meta="Across 18 Chapters" />
        <StatCard label="Current Cycle" value="2027 Season" meta="Sydney Cutoff: Aug 2027" tone="volt" />
        <StatCard label="Qualification" value="Top 16 Direct" meta="Remaining via wildcards" />
      </div>

      {/* FILTER CONTROLS */}
      <div className="panel p-4 bg-carbon border border-subtle grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-mono text-titanium mb-1">DIVISION</label>
          <Select
            value={division}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDivision(e.target.value)}
            style={{ minHeight: "44px" }}
          >
            <option value="Open Crew">Open Crew Division</option>
            <option value="Monster Crew">Monster Crew Division</option>
            <option value="Young Guns">Young Guns (Junior)</option>
            <option value="Varsity">Varsity Division</option>
            <option value="BG.ONE">BG.ONE 1v1 Street Battles</option>
          </Select>
        </div>
        <div>
          <label className="block text-xs font-mono text-titanium mb-1">SEASON</label>
          <Select
            value={season}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSeason(e.target.value)}
            style={{ minHeight: "44px" }}
          >
            <option value="2027">2027 Championship Season</option>
            <option value="2026">2026 Season Archive</option>
          </Select>
        </div>
      </div>

      {/* RANKINGS TABLE */}
      <div className="panel bg-carbon border border-subtle overflow-x-auto rounded-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-subtle text-xs mono text-titanium">
              <th className="p-4">Rank</th>
              <th className="p-4">Trend</th>
              <th className="p-4">Crew & Country</th>
              <th className="p-4">World Ranking Points</th>
              <th className="p-4">Recent Major Placement</th>
              <th className="p-4">Advancement Status</th>
              <th className="p-4 text-right">Profile</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-subtle">
            {rankings.map((r) => (
              <tr key={r.rank} className="hover:bg-subtle/30 transition-colors">
                <td className="p-4 mono font-black text-2xl text-volt">#{r.rank}</td>
                <td className="p-4 mono text-xs">
                  <span
                    className={
                      r.delta.startsWith("+")
                        ? "text-volt font-bold"
                        : r.delta.startsWith("-")
                        ? "text-crimson font-bold"
                        : "text-titanium"
                    }
                  >
                    {r.delta}
                  </span>
                </td>
                <td className="p-4">
                  <strong className="block text-chrome text-lg">{r.crew}</strong>
                  <span className="text-xs text-titanium">
                    {r.country} · [{r.code}]
                  </span>
                </td>
                <td className="p-4 mono text-xl font-bold text-white">{r.points.toLocaleString()} pts</td>
                <td className="p-4 text-xs text-titanium">{r.eventsWon}</td>
                <td className="p-4">
                  <Status tone={r.tone}>{r.status}</Status>
                </td>
                <td className="p-4 text-right">
                  <Link
                    href={`/crews/${r.slug}`}
                    className="button button-ghost text-xs"
                    style={{ minHeight: "38px" }}
                  >
                    View Crew <Arrow />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
