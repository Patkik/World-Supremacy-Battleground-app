"use client";

import { use } from "react";
import Link from "next/link";
import { Arrow, Brand, PageHeading, Status } from "@/components/ui";

export default function EventJudgeDeskPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);

  const lineup = [
    { entryId: "entry-manila-open-1", number: "014", crew: "Afterhours Collective", division: "Open Crew", status: "On Stage" },
    { entryId: "entry-manila-open-2", number: "015", crew: "Alliance Project", division: "Open Crew", status: "On Deck" },
    { entryId: "entry-manila-monster-1", number: "016", crew: "FMD Xtreme", division: "Monster Crew", status: "Scheduled" },
  ];

  return (
    <div className="judge-shell">
      <header className="judge-header">
        <Brand />
        <div className="judge-event">
          <strong>Manila Session 2027</strong>
          <span>Event Desk #{eventId} / Open Crew</span>
        </div>
        <Link href="/console" className="text-link">
          Duty Switch <Arrow diagonal />
        </Link>
      </header>

      <main className="judge-main max-w-5xl mx-auto p-6">
        <PageHeading
          eyebrow="Accredited Judging Desk"
          title="Lineup & Scorecard Selection"
          description="Select the performing crew to score on the official 100-point rubric. Scores remain local until explicitly submitted."
        />

        <div className="space-y-4 mt-8">
          {lineup.map((item) => (
            <div
              key={item.entryId}
              className="panel p-6 flex justify-between items-center bg-carbon border border-subtle hover:border-volt transition-colors"
            >
              <div className="flex items-center gap-6">
                <div className="judge-entry-number">
                  <span>Entry</span>
                  <strong className="mono">{item.number}</strong>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Status tone={item.status === "On Stage" ? "volt" : "neutral"}>
                      {item.status}
                    </Status>
                    <span className="text-xs mono text-titanium">{item.division}</span>
                  </div>
                  <h2 className="text-xl font-bold text-chrome">{item.crew}</h2>
                  <span className="mono text-xs text-muted">ID: {item.entryId}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Link
                  href={`/console/${eventId}/judge/${item.entryId}`}
                  className="button button-volt"
                >
                  Open Scorecard <Arrow />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}