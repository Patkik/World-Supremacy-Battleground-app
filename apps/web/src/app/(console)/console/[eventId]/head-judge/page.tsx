"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Arrow, Brand, PageHeading, Status, Button, StatCard } from "@/components/ui";

export default function HeadJudgeOverviewPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const [frozen, setFrozen] = useState(false);

  const divisions = [
    {
      id: "div-open-crew",
      name: "Open Crew",
      entriesCount: 18,
      submittedScores: 18,
      status: "Ready for Lock",
      flaggedOutliers: 0,
      averageScore: "87.42",
      tone: "volt" as const,
    },
    {
      id: "div-monster-crew",
      name: "Monster Crew",
      entriesCount: 12,
      submittedScores: 10,
      status: "Scoring Active",
      flaggedOutliers: 1,
      averageScore: "84.15",
      tone: "amber" as const,
    },
    {
      id: "div-young-guns",
      name: "Young Guns",
      entriesCount: 14,
      submittedScores: 14,
      status: "Finalized & Locked",
      flaggedOutliers: 0,
      averageScore: "89.05",
      tone: "neutral" as const,
    },
    {
      id: "div-varsity",
      name: "Varsity",
      entriesCount: 16,
      submittedScores: 16,
      status: "Ready for Lock",
      flaggedOutliers: 2,
      averageScore: "86.30",
      tone: "amber" as const,
    },
  ];

  const judges = [
    { id: "J01", name: "Ken Swift", role: "Head Judge / Panel A", activeEntry: "014", ping: "18ms", status: "Active" },
    { id: "J02", name: "Buddha Stretch", role: "Panel A - Foundation", activeEntry: "014", ping: "22ms", status: "Active" },
    { id: "J03", name: "Yuki", role: "Panel A - Choreography", activeEntry: "014", ping: "24ms", status: "Active" },
    { id: "TJ1", name: "Lando Wilkins", role: "Technical Deductions", activeEntry: "014", ping: "15ms", status: "Active" },
  ];

  return (
    <div className="judge-shell">
      <header className="judge-header">
        <Brand />
        <div className="judge-event">
          <strong>Head Judge Console</strong>
          <span>Event Desk #{eventId} · Audit & Finalization</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/console" className="text-link">
            Console Hub <Arrow diagonal />
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <PageHeading
            eyebrow="Authoritative Panel Control"
            title="Division Completion & Score Matrix"
            description="Audit real-time judge scoring progress, review statistical outliers, and execute division locks prior to public reveal."
          />
          <div className="flex items-center gap-3">
            <Button
              variant={frozen ? "secondary" : "danger"}
              onClick={() => setFrozen(!frozen)}
              style={{ minHeight: "48px" }}
            >
              {frozen ? "Unfreeze Scoring Engine" : "Emergency Freeze Scoring"}
            </Button>
          </div>
        </div>

        {frozen && (
          <div className="panel p-4 bg-crimson/10 border border-crimson text-crimson rounded flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-bold">SYSTEM LOCKED:</span>
              <span>All judge desks are currently paused. No score submissions will be accepted.</span>
            </div>
            <span className="mono text-xs">REVISION_HOLD_0x99A</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="Total Divisions" value="4" meta="All scheduled" />
          <StatCard label="Total Entries Scored" value="58 / 60" meta="96.6% complete" tone="volt" />
          <StatCard label="Outlier Flags" value="3" meta="Requires head review" tone="amber" />
          <StatCard label="Audit Status" value="In Sync" meta="All nodes reachable" />
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-chrome">Divisions Overview</h2>
          <div className="space-y-3">
            {divisions.map((div) => (
              <div
                key={div.id}
                className="panel p-6 bg-carbon border border-subtle flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-chrome">{div.name}</h3>
                    <Status tone={div.tone}>{div.status}</Status>
                    {div.flaggedOutliers > 0 && (
                      <span className="badge badge-amber text-xs mono">
                        {div.flaggedOutliers} Outlier{div.flaggedOutliers > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-titanium">
                    <span className="mono">{div.submittedScores} / {div.entriesCount}</span> routines scored · Average: <span className="mono text-white">{div.averageScore}</span> pts
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    href={`/console/${eventId}/head-judge/${div.id}`}
                    className="button button-volt"
                    style={{ minHeight: "48px", display: "inline-flex", alignItems: "center" }}
                  >
                    Review Division <Arrow />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-chrome">Active Judging Nodes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {judges.map((j) => (
              <div key={j.id} className="panel p-4 bg-carbon border border-subtle space-y-2">
                <div className="flex justify-between items-start">
                  <span className="mono text-xs text-titanium">{j.id}</span>
                  <Status tone="volt">{j.status}</Status>
                </div>
                <div>
                  <h4 className="font-bold text-chrome">{j.name}</h4>
                  <p className="text-xs text-titanium">{j.role}</p>
                </div>
                <div className="pt-2 border-t border-subtle flex justify-between text-xs mono text-muted">
                  <span>Entry: {j.activeEntry}</span>
                  <span>Latency: {j.ping}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
