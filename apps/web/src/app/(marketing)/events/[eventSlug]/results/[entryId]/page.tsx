"use client";

import { use } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status, Button, StatCard } from "@/components/ui";

export default function PublicScorecardDetailPage({
  params,
}: {
  params: Promise<{ eventSlug: string; entryId: string }>;
}) {
  const { eventSlug, entryId } = use(params);

  const entry = {
    id: entryId,
    event: eventSlug.replace(/-/g, " ").toUpperCase(),
    crew: "Afterhours Collective",
    number: "014",
    division: "Open Crew Division",
    origin: "Manila, Philippines",
    rank: 1,
    totalEntries: 18,
    totalScore: "88.33",
    status: "Published & Certified",
    criteria: [
      { name: "Execution & Synchronization", max: 30, score: "27.50", desc: "Cleanliness of lines, unison, technical difficulty of tricks." },
      { name: "Choreography & Staging", max: 25, score: "22.00", desc: "Formations, transitions, spatial coverage, level variation." },
      { name: "Creativity & Originality", max: 20, score: "18.00", desc: "Signature concepts, narrative arc, innovative movement." },
      { name: "Musicality & Dynamic Expression", max: 15, score: "13.50", desc: "Accents, polyrhythms, dynamic control, texture changes." },
      { name: "Stage Presence & Showmanship", max: 10, score: "8.50", desc: "Projection, character integrity, confidence, crowd energy." },
    ],
    deductions: [
      { rule: "Time Limit Excess", penalty: "0.0 pts" },
      { rule: "Floor Prop Violation", penalty: "0.0 pts" },
      { rule: "Lyric Infraction", penalty: "0.0 pts" },
    ],
    judges: [
      { name: "Ken Swift", role: "Head Judge / Panel A" },
      { name: "Buddha Stretch", role: "Elite Panel - Foundation" },
      { name: "Yuki", role: "Elite Panel - Choreography" },
    ],
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeading
          eyebrow={`Official Public Scorecard · ${entry.event}`}
          title={`${entry.crew} · Entry #${entry.number}`}
          description={`Complete rubric evaluation, criteria point breakdown, and panel certification for ${entry.crew} in the ${entry.division}.`}
        />
        <div className="flex gap-2">
          <Link
            href={`/events/${eventSlug}/results`}
            className="button button-secondary"
            style={{ minHeight: "48px" }}
          >
            Division Leaderboard <Arrow diagonal />
          </Link>
          <Button
            variant="secondary"
            onClick={() => window.print()}
            style={{ minHeight: "48px" }}
          >
            Print Scorecard PDF
          </Button>
        </div>
      </div>

      {/* RESULT HERO CARD */}
      <div className="panel p-8 bg-carbon border-2 border-volt rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="badge badge-volt">RANK #{entry.rank} (CHAMPION)</span>
            <Status tone="volt">{entry.status}</Status>
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-chrome">{entry.crew}</h2>
          <p className="text-sm text-titanium mt-1">
            {entry.origin} · {entry.division} · Entry #{entry.number}
          </p>
        </div>

        <div className="text-right">
          <span className="text-xs text-titanium mono block">VERIFIED OFFICIAL SCORE</span>
          <span className="mono text-5xl font-black text-white">{entry.totalScore}</span>
          <span className="text-xs text-titanium mono block mt-1">out of 100.00 pts</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Placement" value={`#${entry.rank} of ${entry.totalEntries}`} meta="Gold Medal" tone="volt" />
        <StatCard label="Deductions" value="0.0 pts" meta="Clean technical run" tone="volt" />
        <StatCard label="World Finals" value="Direct Qualified" meta="Sydney 2027 Seed #1" tone="volt" />
      </div>

      {/* 5-CRITERIA BREAKDOWN TABLE */}
      <section className="panel p-6 bg-carbon border border-subtle rounded-xl space-y-4">
        <h3 className="text-xl font-bold text-chrome">5-Criteria Rubric Breakdown</h3>
        <div className="divide-y divide-subtle">
          {entry.criteria.map((c) => (
            <div key={c.name} className="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h4 className="font-bold text-chrome">{c.name}</h4>
                <p className="text-xs text-titanium">{c.desc}</p>
              </div>
              <div className="flex items-baseline gap-1 text-right">
                <strong className="mono text-2xl text-white font-extrabold">{c.score}</strong>
                <span className="mono text-xs text-titanium">/ {c.max}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PANEL OF ACCREDITED JUDGES */}
      <section className="panel p-6 bg-carbon border border-subtle rounded-xl space-y-4">
        <h3 className="text-xl font-bold text-chrome">Certifying Judge Panel</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {entry.judges.map((j) => (
            <div key={j.name} className="p-4 bg-obsidian border border-subtle rounded-lg">
              <strong className="block text-chrome">{j.name}</strong>
              <span className="text-xs text-titanium">{j.role}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-between items-center text-xs mono text-titanium pt-2 border-t border-subtle">
        <span>CRYPTOGRAPHIC RECEIPT: SHA256-MANILA-OPEN-014-CERTIFIED</span>
        <Link href={`/events/${eventSlug}/results`} className="text-link">
          Return to Leaderboard <Arrow diagonal />
        </Link>
      </div>
    </div>
  );
}
