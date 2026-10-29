"use client";

import { use, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Arrow } from "@/components/ui";

export default function ArenaLiveDisplayPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const [freshness, setFreshness] = useState("LIVE · 12ms");
  const [seconds, setSeconds] = useState(64);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((s) => (s < 150 ? s + 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentRoutine = {
    number: "014",
    crew: "AFTERHOURS COLLECTIVE",
    division: "OPEN CREW DIVISION",
    origin: "Manila, Philippines",
    countryCode: "PH",
    sponsor: "PRESENTED BY MONSTER ENERGY & RED BULL",
    nextCrew: "Alliance Project (Cebu, PH)",
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
            WORLD SUPREMACY<br />
            BATTLEGROUNDS
          </span>
        </div>
        <div className="arena-event-label">
          <span>Manila Session · Event Desk #{eventId}</span>
          <span className="mono text-xs">{freshness}</span>
        </div>
      </header>

      <section className="arena-stage" aria-live="polite">
        <div className="arena-stage-meta">
          <span className="arena-state">
            <span className="status-dot" /> Now On Stage
          </span>
          <span className="mono">
            ENTRY #{currentRoutine.number} · {currentRoutine.division}
          </span>
          <span className="mono text-volt">
            {Math.floor(seconds / 60)}:{seconds % 60 < 10 ? `0${seconds % 60}` : seconds % 60}
          </span>
        </div>

        <h1>{currentRoutine.crew}</h1>

        <div className="arena-crew-origin">
          <span className="country-code mono">{currentRoutine.countryCode}</span>
          <span>{currentRoutine.origin}</span>
        </div>
      </section>

      <footer className="arena-bottom">
        <div>
          <span className="eyebrow">On Deck Next</span>
          <strong>{currentRoutine.nextCrew}</strong>
          <span>Open Crew Division · Entry #015</span>
        </div>
        <span className="arena-bottom-slogan">
          REPRESENT<br />
          YOUR WORLD.
        </span>
      </footer>

      <div className="arena-preview-controls">
        <span>Stadium Main LED Display · Event Desk #{eventId}</span>
        <Link href={`/console/${eventId}/broadcast`}>
          Broadcast Controller <Arrow diagonal />
        </Link>
        <Link href={`/arena-live/${eventId}/results`}>
          Results Reveal <Arrow diagonal />
        </Link>
        <Link href={`/arena-live/${eventId}/bracket`}>
          Battle Bracket <Arrow diagonal />
        </Link>
        <Link href={`/arena-live/${eventId}/holding`}>
          Holding Scene <Arrow diagonal />
        </Link>
      </div>
    </main>
  );
}
