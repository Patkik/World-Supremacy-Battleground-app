"use client";

import { use } from "react";
import Image from "next/image";
import Link from "next/link";
import { Arrow } from "@/components/ui";

export default function ArenaBracketPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);

  const bracketData = {
    round: "QUARTERFINALS · 1V1 ALL STYLES",
    activeMatch: {
      number: "MATCH 2",
      red: { dancer: "KILLA KIM", origin: "PH", votes: 2, status: "Active" },
      blue: { dancer: "ISSEI", origin: "JPN", votes: 1, status: "Active" },
    },
    matches: [
      { id: "M1", red: "Kid David [USA]", blue: "Lil Zoo [MOR]", winner: "Kid David" },
      { id: "M2", red: "Killa Kim [PH]", blue: "Issei [JPN]", winner: "BATTLE ON AIR" },
      { id: "M3", red: "Menno [NLD]", blue: "Phil Wizard [CAN]", winner: "Upcoming" },
      { id: "M4", red: "Hong 10 [KOR]", blue: "Victor [USA]", winner: "Upcoming" },
    ],
  };

  return (
    <main id="main-content" className="arena-display">
      <Image
        src="/images/dance-hero.png"
        alt=""
        fill
        sizes="100vw"
        className="arena-background"
        priority
      />
      <div className="arena-shade" />

      <header className="arena-header">
        <div className="arena-brand">
          <Image
            src="/brand/wsb-logo.png"
            className="brand-mark-white"
            alt="World Supremacy Battlegrounds"
            width={100}
            height={100}
          />
          <span>
            BG.ONE WORLD<br />
            BATTLE ARENA
          </span>
        </div>
        <div className="arena-event-label">
          <span>{bracketData.round}</span>
          <span className="mono text-xs text-volt">LIVE TOURNAMENT TREE</span>
        </div>
      </header>

      <section className="arena-stage py-4" aria-live="polite">
        <div className="arena-stage-meta mb-2">
          <span className="arena-state">
            <span className="status-dot" /> Now Battling · {bracketData.activeMatch.number}
          </span>
          <span className="mono text-titanium">BEST OF 2 ROUNDS · FIRST TO 2 VOTES ADVANCES</span>
        </div>

        {/* ACTIVE CLASH DISPLAY */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-auto">
          <div className="p-8 rounded-2xl bg-gradient-to-r from-crimson/30 to-obsidian border-2 border-crimson flex flex-col justify-between">
            <div>
              <span className="px-3 py-1 rounded bg-crimson text-white font-bold text-xs uppercase mono">
                Red Corner
              </span>
              <h2 className="text-4xl md:text-5xl font-black text-white mt-3">
                {bracketData.activeMatch.red.dancer}
              </h2>
              <span className="country-code mono mt-2 inline-block">
                {bracketData.activeMatch.red.origin}
              </span>
            </div>
            <div className="pt-6 border-t border-subtle flex justify-between items-end">
              <span className="text-xs mono text-titanium">JUDGE VOTES</span>
              <span className="mono text-4xl font-extrabold text-crimson">
                {bracketData.activeMatch.red.votes}
              </span>
            </div>
          </div>

          <div className="p-8 rounded-2xl bg-gradient-to-l from-blue-600/30 to-obsidian border-2 border-blue-500 flex flex-col justify-between">
            <div>
              <span className="px-3 py-1 rounded bg-blue-600 text-white font-bold text-xs uppercase mono">
                Blue Corner
              </span>
              <h2 className="text-4xl md:text-5xl font-black text-white mt-3">
                {bracketData.activeMatch.blue.dancer}
              </h2>
              <span className="country-code mono mt-2 inline-block">
                {bracketData.activeMatch.blue.origin}
              </span>
            </div>
            <div className="pt-6 border-t border-subtle flex justify-between items-end">
              <span className="text-xs mono text-titanium">JUDGE VOTES</span>
              <span className="mono text-4xl font-extrabold text-blue-400">
                {bracketData.activeMatch.blue.votes}
              </span>
            </div>
          </div>
        </div>

        {/* BRACKET OVERVIEW TILES */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          {bracketData.matches.map((m) => (
            <div key={m.id} className="p-3 bg-obsidian/80 border border-subtle rounded-lg text-xs">
              <span className="mono text-titanium block">{m.id}</span>
              <div className="font-bold text-chrome truncate">{m.red}</div>
              <div className="text-titanium truncate">vs {m.blue}</div>
              <span className={`mono text-[10px] mt-1 block ${m.winner.includes("ON AIR") ? "text-volt font-bold" : "text-titanium"}`}>
                {m.winner}
              </span>
            </div>
          ))}
        </div>
      </section>

      <footer className="arena-bottom">
        <div>
          <span className="eyebrow">World Supremacy Battlegrounds</span>
          <strong>BG.ONE Street Battle System</strong>
          <span>Authoritative corner voting recorded in real time.</span>
        </div>
        <span className="arena-bottom-slogan">
          ONE ON ONE.<br />
          NO EXCUSES.
        </span>
      </footer>

      <div className="arena-preview-controls">
        <span>Arena Bracket Display · Event #{eventId}</span>
        <Link href={`/console/${eventId}/battles`}>
          Battle Desk <Arrow diagonal />
        </Link>
        <Link href={`/arena-live/${eventId}`} className="ml-auto">
          Return to Stage HUD <Arrow diagonal />
        </Link>
      </div>
    </main>
  );
}
