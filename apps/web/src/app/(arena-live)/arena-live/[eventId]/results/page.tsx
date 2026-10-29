"use client";

import { use, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Arrow } from "@/components/ui";

export default function ArenaResultRevealPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const [revealStep, setRevealStep] = useState<number>(3); // 3 = all revealed, 1 = 3rd place, 2 = 2nd place

  const podium = [
    {
      place: "CHAMPION",
      rank: 1,
      crew: "AFTERHOURS COLLECTIVE",
      origin: "Manila, Philippines",
      code: "PH",
      score: "88.33",
      medal: "GOLD",
      qualified: true,
      color: "border-volt text-volt",
    },
    {
      place: "2ND PLACE",
      rank: 2,
      crew: "ALLIANCE PROJECT",
      origin: "Cebu, Philippines",
      code: "PH",
      score: "87.17",
      medal: "SILVER",
      qualified: true,
      color: "border-titanium text-chrome",
    },
    {
      place: "3RD PLACE",
      rank: 3,
      crew: "LEGION X",
      origin: "Quezon City, Philippines",
      code: "PH",
      score: "85.00",
      medal: "BRONZE",
      qualified: true,
      color: "border-amber text-amber",
    },
  ];

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
            OFFICIAL RESULTS<br />
            REVEAL
          </span>
        </div>
        <div className="arena-event-label">
          <span>Open Crew Division · Manila Session</span>
          <span className="mono text-xs">CERTIFIED BY WSB HEAD JUDGE</span>
        </div>
      </header>

      <section className="arena-stage py-6" aria-live="polite">
        <div className="arena-stage-meta mb-4">
          <span className="arena-state">
            <span className="status-dot" /> Division Official Podiums
          </span>
          <span className="mono">TOP 3 QUALIFIED FOR WORLD FINALS</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-auto">
          {podium.map((p) => {
            const isVisible = revealStep >= (4 - p.rank);
            return (
              <div
                key={p.rank}
                className={`p-6 rounded-2xl bg-obsidian/90 border-2 ${
                  isVisible ? p.color : "border-subtle opacity-30"
                } transition-all duration-700 flex flex-col justify-between`}
                style={{ minHeight: "320px" }}
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="mono font-bold text-sm tracking-wider uppercase">
                      {p.place}
                    </span>
                    <span className="mono text-xs text-titanium">{p.medal}</span>
                  </div>
                  {isVisible ? (
                    <>
                      <h2 className="text-2xl md:text-3xl font-black text-white leading-tight">
                        {p.crew}
                      </h2>
                      <p className="text-sm text-titanium mt-1">
                        {p.origin} · [{p.code}]
                      </p>
                    </>
                  ) : (
                    <div className="h-16 flex items-center text-titanium mono text-sm">
                      [ LOCKED ]
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-subtle flex justify-between items-end">
                  <div>
                    <span className="text-[10px] mono text-titanium block">OFFICIAL SCORE</span>
                    <span className="mono text-3xl font-extrabold text-white">
                      {isVisible ? p.score : "--.--"}
                    </span>
                  </div>
                  {isVisible && p.qualified && (
                    <span className="badge badge-volt text-[10px] mono font-bold">
                      WORLDS QUALIFIED
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="arena-bottom">
        <div>
          <span className="eyebrow">World Supremacy Battlegrounds</span>
          <strong>Manila Session 2027 Official Podium</strong>
          <span>Results finalized and recorded on immutable audit ledger.</span>
        </div>
        <span className="arena-bottom-slogan">
          TO THE<br />
          WORLD FINALS.
        </span>
      </footer>

      <div className="arena-preview-controls">
        <span>Reveal Controller · Step {revealStep} of 3</span>
        <button
          onClick={() => setRevealStep(1)}
          className="button button-ghost text-xs"
        >
          Reveal 3rd Only
        </button>
        <button
          onClick={() => setRevealStep(2)}
          className="button button-ghost text-xs"
        >
          Reveal 2nd & 3rd
        </button>
        <button
          onClick={() => setRevealStep(3)}
          className="button button-ghost text-xs"
        >
          Full Podium Reveal
        </button>
        <Link href={`/arena-live/${eventId}`} className="ml-auto">
          Return to Stage HUD <Arrow diagonal />
        </Link>
      </div>
    </main>
  );
}
