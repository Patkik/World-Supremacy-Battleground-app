"use client";

import Link from "next/link";
import { Arrow, PageHeading, Status, Button, StatCard } from "@/components/ui";

export default function DirectorScorecardsPage() {
  const scorecards = [
    {
      id: "sc-manila-2027",
      event: "Manila Session 2027",
      division: "Open Crew Division",
      entry: "014",
      routineName: "Afterhours Collective - Cyber Funk Vol. 3",
      rank: 1,
      totalEntries: 18,
      status: "Published & Certified",
      totalScore: "88.33",
      criteria: [
        { name: "Execution & Synchronization", max: 30, score: "27.5" },
        { name: "Choreography & Staging", max: 25, score: "22.0" },
        { name: "Creativity & Originality", max: 20, score: "18.0" },
        { name: "Musicality & Dynamics", max: 15, score: "13.5" },
        { name: "Stage Presence & Character", max: 10, score: "8.5" },
      ],
      deductions: "0.0",
      judgeNotes:
        "Outstanding precision on the 32-count canon ripple. Footwork execution in section 2 was exceptionally clean across all 12 dancers. Strong championship contender.",
      qualified: true,
      tone: "volt" as const,
    },
    {
      id: "sc-sydney-2026",
      event: "Sydney World Qualifier 2026",
      division: "Open Crew Division",
      entry: "008",
      routineName: "Afterhours Collective - Midnight Rush",
      rank: 2,
      totalEntries: 22,
      status: "Archived Certified",
      totalScore: "86.10",
      criteria: [
        { name: "Execution & Synchronization", max: 30, score: "26.0" },
        { name: "Choreography & Staging", max: 25, score: "21.5" },
        { name: "Creativity & Originality", max: 20, score: "17.8" },
        { name: "Musicality & Dynamics", max: 15, score: "13.0" },
        { name: "Stage Presence & Character", max: 10, score: "8.3" },
      ],
      deductions: "-0.5 (Time overrun 4s)",
      judgeNotes:
        "High energy performance throughout. Watch stage boundary spacing during floor slide sequences.",
      qualified: true,
      tone: "neutral" as const,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeading
          eyebrow="Certified Performance Outcome"
          title="Official Scorecards & Judge Evaluations"
          description="Examine detailed rubric breakdowns, judge panel remarks, and technical deduction notes published by accredited WSB head judges."
        />
        <Link
          href="/app/advancement"
          className="button button-volt"
          style={{ minHeight: "48px" }}
        >
          World Finals Invites <Arrow />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Latest Placement" value="Rank #1 (Champion)" meta="Manila Session 2027" tone="volt" />
        <StatCard label="Aggregate Average" value="88.33 / 100" meta="Trimmed Olympic Mean" />
        <StatCard label="World Status" value="Qualified" meta="Sydney World Finals" tone="volt" />
        <StatCard label="Ledger Hash" value="0x884F...A1" meta="Cryptographically locked" />
      </div>

      <div className="space-y-6">
        {scorecards.map((sc) => (
          <div key={sc.id} className="panel p-6 bg-carbon border border-subtle rounded-xl space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="mono text-xs text-titanium">{sc.event}</span>
                  <Status tone={sc.tone}>{sc.status}</Status>
                  {sc.qualified && (
                    <span className="badge badge-volt text-xs">WORLDS QUALIFIED</span>
                  )}
                </div>
                <h3 className="text-2xl font-black text-chrome">{sc.routineName}</h3>
                <p className="text-sm text-titanium">
                  {sc.division} · Entry #{sc.entry} · Placement: <strong className="text-volt">#{sc.rank} of {sc.totalEntries}</strong>
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-titanium mono block">OFFICIAL SCORE</span>
                <span className="mono text-4xl font-extrabold text-white">{sc.totalScore}</span>
              </div>
            </div>

            {/* CRITERIA BREAKDOWN */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-4 border-t border-subtle">
              {sc.criteria.map((c) => (
                <div key={c.name} className="p-3 bg-obsidian border border-subtle rounded">
                  <span className="text-[10px] text-titanium block truncate">{c.name}</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <strong className="mono text-lg text-chrome">{c.score}</strong>
                    <span className="mono text-xs text-titanium">/ {c.max}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* DEDUCTIONS & JUDGE COMMENTARY */}
            <div className="p-4 bg-obsidian border border-subtle rounded-lg space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-chrome">Head Judge Feedback & Commentary:</span>
                <span className="mono text-crimson">Deductions: {sc.deductions}</span>
              </div>
              <p className="text-sm text-titanium italic">"{sc.judgeNotes}"</p>
            </div>

            <div className="flex justify-between items-center text-xs pt-2 border-t border-subtle">
              <span className="text-titanium">Published projection immutable under WSB Rulebook 2026/27.</span>
              <Button variant="secondary" onClick={() => window.print()} style={{ minHeight: "40px" }}>
                Print Official Scorecard PDF
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
