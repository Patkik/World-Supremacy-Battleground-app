"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Arrow, Brand, PageHeading, Status, Button, StatCard } from "@/components/ui";

export default function BackstageMarshalPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);

  const [queue, setQueue] = useState([
    {
      id: "q-1",
      entry: "014",
      crew: "Afterhours Collective",
      division: "Open Crew",
      dancers: "12 / 12 present",
      state: "On Stage",
      cue: "Stage Entrance with music",
      tone: "volt" as const,
    },
    {
      id: "q-2",
      entry: "015",
      crew: "Alliance Project",
      division: "Open Crew",
      dancers: "15 / 15 present",
      state: "On Deck (Wings)",
      cue: "Walk to center stage before audio",
      tone: "amber" as const,
    },
    {
      id: "q-3",
      entry: "012",
      crew: "Legion X",
      division: "Open Crew",
      dancers: "10 / 10 present",
      state: "In Holding Area",
      cue: "Stage Entrance with music",
      tone: "neutral" as const,
    },
    {
      id: "q-4",
      entry: "016",
      crew: "FMD Xtreme",
      division: "Monster Crew",
      dancers: "24 / 24 present",
      state: "Warm-up Studio",
      cue: "Prop setup required (4 chairs)",
      tone: "neutral" as const,
    },
  ]);

  const [stageHold, setStageHold] = useState(false);

  const handleAdvanceQueue = () => {
    // Advance queue states
    if (queue.length > 1) {
      const current = queue[0];
      const next = queue.slice(1);
      setQueue([...next, { ...current, state: "Completed", tone: "neutral" }]);
    }
  };

  return (
    <div className="judge-shell">
      <header className="judge-header">
        <Brand />
        <div className="judge-event">
          <strong>Backstage Marshal Console</strong>
          <span>Event Desk #{eventId} · Stage Left Operations</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href={`/console/${eventId}/audio`} className="text-link">
            DJ Audio Desk <Arrow diagonal />
          </Link>
          <Link href="/console" className="text-link">
            Console Hub <Arrow diagonal />
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <PageHeading
            eyebrow="Flow & Timekeeping Control"
            title="Backstage Queue & Marshalling"
            description="Control stage access, verify dancer headcount in the staging wings, and dispatch the next routine to the arena floor."
          />
          <div className="flex items-center gap-3">
            <Button
              variant={stageHold ? "secondary" : "danger"}
              onClick={() => setStageHold(!stageHold)}
              style={{ minHeight: "48px" }}
            >
              {stageHold ? "Release Stage Hold" : "EMERGENCY STAGE HOLD"}
            </Button>
            <Button
              variant="primary"
              onClick={handleAdvanceQueue}
              style={{ minHeight: "48px" }}
            >
              Advance Routine To Stage
            </Button>
          </div>
        </div>

        {stageHold && (
          <div className="panel p-4 bg-crimson/20 border-2 border-crimson text-white rounded flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-bold text-crimson text-lg">STAGE HOLD ACTIVE:</span>
              <span>Audio and lighting operators instructed to hold current cue. Do not release next crew onto floor.</span>
            </div>
            <Status tone="crimson">STAGE FROZEN</Status>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="Now On Stage" value="Entry #014" meta="Afterhours Collective" tone="volt" />
          <StatCard label="On Deck (Wings)" value="Entry #015" meta="Alliance Project" tone="amber" />
          <StatCard label="Floor Schedule" value="On Time" meta="Variance: +0m 42s" />
          <StatCard label="Dancers Backstage" value="61" meta="Across 4 active crews" />
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-chrome">Live Marshalling Sequence</h2>
          <div className="space-y-4">
            {queue.map((item, idx) => (
              <div
                key={item.id}
                className={`panel p-6 bg-carbon border ${
                  idx === 0
                    ? "border-volt ring-1 ring-volt"
                    : idx === 1
                    ? "border-amber"
                    : "border-subtle"
                } flex flex-col md:flex-row justify-between items-start md:items-center gap-6`}
              >
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 rounded bg-obsidian border border-subtle flex flex-col items-center justify-center">
                    <span className="text-[10px] mono text-titanium">ENTRY</span>
                    <strong className="mono text-lg text-volt">{item.entry}</strong>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <Status tone={item.tone}>{item.state}</Status>
                      <span className="mono text-xs text-titanium">{item.division}</span>
                    </div>
                    <h3 className="text-2xl font-black text-chrome">{item.crew}</h3>
                    <p className="text-xs text-titanium">
                      Roster: <span className="mono text-white">{item.dancers}</span> · Audio Cue: <span className="text-volt">{item.cue}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                  <Button variant="secondary" style={{ minHeight: "44px" }}>
                    Call To Wings
                  </Button>
                  <Button variant="secondary" style={{ minHeight: "44px" }}>
                    Verify Roster
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
