"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Arrow, Brand, PageHeading, Status, Button, StatCard } from "@/components/ui";

export default function BattleControlPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const [activeRound, setActiveRound] = useState("Quarterfinals");

  const matches = [
    {
      id: "match-01",
      round: "Quarterfinals",
      slot: "Match 1",
      red: { dancer: "Kid David", crew: "Renegades", city: "Sacramento, USA" },
      blue: { dancer: "Lil Zoo", crew: "El Mouwahidine", city: "Casablanca, MOR" },
      votesRed: 2,
      votesBlue: 1,
      status: "Decision Reached",
      winner: "Red (Kid David)",
      tone: "volt" as const,
    },
    {
      id: "match-02",
      round: "Quarterfinals",
      slot: "Match 2",
      red: { dancer: "Killa Kim", crew: "Philippine Allstars", city: "Manila, PH" },
      blue: { dancer: "Issei", crew: "Found Nation", city: "Tokyo, JPN" },
      votesRed: 1,
      votesBlue: 1,
      status: "In Progress (Tie / Overtime)",
      winner: null,
      tone: "amber" as const,
    },
    {
      id: "match-03",
      round: "Quarterfinals",
      slot: "Match 3",
      red: { dancer: "Menno", crew: "Def Dogz", city: "Rotterdam, NLD" },
      blue: { dancer: "Phil Wizard", crew: "The Wizards", city: "Vancouver, CAN" },
      votesRed: 0,
      votesBlue: 0,
      status: "On Deck",
      winner: null,
      tone: "neutral" as const,
    },
    {
      id: "match-04",
      round: "Quarterfinals",
      slot: "Match 4",
      red: { dancer: "Hong 10", crew: "Flow XL", city: "Seoul, KOR" },
      blue: { dancer: "Victor", crew: "Squadron", city: "Orlando, USA" },
      votesRed: 0,
      votesBlue: 0,
      status: "Scheduled",
      winner: null,
      tone: "neutral" as const,
    },
  ];

  return (
    <div className="judge-shell">
      <header className="judge-header">
        <Brand />
        <div className="judge-event">
          <strong>BG.ONE Battle Control Desk</strong>
          <span>Event Desk #{eventId} · 1v1 World Bracket</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href={`/arena-live/${eventId}/bracket`} target="_blank" className="text-link">
            Arena Bracket Display <Arrow diagonal />
          </Link>
          <Link href="/console" className="text-link">
            Console Hub <Arrow diagonal />
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <PageHeading
            eyebrow="BG.ONE Street Dance Championship"
            title="Tournament Bracket & Match Dispatch"
            description="Manage live rounds, monitor corner judge tallies, issue overtime rounds, and advance verified winners to the championship tree."
          />
          <div className="flex gap-2">
            {["Top 16", "Quarterfinals", "Semifinals", "Finals"].map((r) => (
              <Button
                key={r}
                variant={activeRound === r ? "primary" : "secondary"}
                onClick={() => setActiveRound(r)}
                style={{ minHeight: "44px" }}
              >
                {r}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="Current Stage" value={activeRound} meta="4 matches" />
          <StatCard label="Active Battle" value="Match 2" meta="Killa Kim vs Issei" tone="amber" />
          <StatCard label="Judge Quorum" value="3 / 3" meta="Swift, Stretch, Yuki" tone="volt" />
          <StatCard label="Arena Feed" value="Live Push" meta="HUD synchronized" />
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-chrome">Round Matches</h2>
          <div className="space-y-4">
            {matches.map((m) => (
              <div
                key={m.id}
                className="panel p-6 bg-carbon border border-subtle flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6"
              >
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="mono text-xs text-titanium">{m.slot}</span>
                    <Status tone={m.tone}>{m.status}</Status>
                    {m.winner && (
                      <span className="badge badge-volt text-xs">Winner: {m.winner}</span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-obsidian border-l-4 border-crimson rounded">
                      <span className="text-xs uppercase font-bold text-crimson">Red Corner</span>
                      <h4 className="text-lg font-bold text-chrome">{m.red.dancer}</h4>
                      <p className="text-xs text-titanium">{m.red.crew} · {m.red.city}</p>
                      <div className="mt-2 mono text-sm text-chrome">
                        Tallied Votes: <strong className="text-crimson font-bold">{m.votesRed}</strong>
                      </div>
                    </div>

                    <div className="p-4 bg-obsidian border-l-4 border-blue-500 rounded">
                      <span className="text-xs uppercase font-bold text-blue-400">Blue Corner</span>
                      <h4 className="text-lg font-bold text-chrome">{m.blue.dancer}</h4>
                      <p className="text-xs text-titanium">{m.blue.crew} · {m.blue.city}</p>
                      <div className="mt-2 mono text-sm text-chrome">
                        Tallied Votes: <strong className="text-blue-400 font-bold">{m.votesBlue}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 w-full lg:w-auto">
                  <Link
                    href={`/console/${eventId}/battles/${m.id}/vote`}
                    className="button button-volt"
                    style={{ minHeight: "48px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                  >
                    Judge Voting HUD <Arrow />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
