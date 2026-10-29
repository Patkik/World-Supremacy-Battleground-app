"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status, Button, StatCard } from "@/components/ui";

export default function AdminEventAdvancementPage({
  params,
}: {
  params: Promise<{ chapterId: string; eventId: string }>;
}) {
  const { chapterId, eventId } = use(params);

  const [allocations, setAllocations] = useState([
    {
      seed: "PH Seed #1",
      division: "Open Crew",
      crew: "Afterhours Collective",
      rank: 1,
      score: "88.33",
      status: "Accepted",
      tone: "volt" as const,
    },
    {
      seed: "PH Seed #2",
      division: "Open Crew",
      crew: "Alliance Project",
      rank: 2,
      score: "87.17",
      status: "Invitation Sent",
      tone: "amber" as const,
    },
    {
      seed: "PH Seed #3",
      division: "Open Crew",
      crew: "Legion X",
      rank: 3,
      score: "85.00",
      status: "Invitation Sent",
      tone: "amber" as const,
    },
    {
      seed: "PH Seed #1",
      division: "Monster Crew",
      crew: "FMD Xtreme",
      rank: 1,
      score: "89.15",
      status: "Accepted",
      tone: "volt" as const,
    },
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeading
          eyebrow={`Chapter / ${chapterId.toUpperCase()} / Events`}
          title="World Championship Quotas & Seed Allocations"
          description={`Manage national representation quotas for Event #${eventId}, track invitation acceptance, and dispatch global final credentials to advancing delegations.`}
        />
        <Button
          variant="secondary"
          onClick={() => alert("Exporting National Delegation Manifest CSV...")}
          style={{ minHeight: "48px" }}
        >
          Export Delegation Manifest
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total Quotas" value="6 Seeds" meta="Assigned to PH Chapter" />
        <StatCard label="Confirmed Accepted" value="2 Crews" meta="Afterhours, FMD Xtreme" tone="volt" />
        <StatCard label="Awaiting Acceptance" value="2 Crews" meta="Deadline Dec 15" tone="amber" />
        <StatCard label="World Final Host" value="Sydney, AU" meta="ICC Theatre 2027" />
      </div>

      <div className="panel bg-carbon border border-subtle overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-subtle text-xs mono text-titanium">
              <th className="p-4">Assigned Seed</th>
              <th className="p-4">Division</th>
              <th className="p-4">Crew</th>
              <th className="p-4">Qualifier Rank</th>
              <th className="p-4">Official Score</th>
              <th className="p-4">Invitation Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-subtle">
            {allocations.map((a, i) => (
              <tr key={i} className="hover:bg-subtle/30 transition-colors">
                <td className="p-4 mono font-bold text-volt">{a.seed}</td>
                <td className="p-4 text-xs text-titanium">{a.division}</td>
                <td className="p-4 font-bold text-chrome">{a.crew}</td>
                <td className="p-4 mono text-xs text-chrome">Rank #{a.rank}</td>
                <td className="p-4 mono text-xs font-bold text-white">{a.score}</td>
                <td className="p-4">
                  <Status tone={a.tone}>{a.status}</Status>
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => alert(`Resending World Finals accreditation link to ${a.crew}`)}
                    className="button button-ghost text-xs"
                  >
                    Resend Notice
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
