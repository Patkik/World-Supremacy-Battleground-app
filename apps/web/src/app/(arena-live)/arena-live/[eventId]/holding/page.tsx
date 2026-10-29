"use client";

import { use } from "react";
import Image from "next/image";
import Link from "next/link";
import { Arrow } from "@/components/ui";

export default function ArenaHoldingScenePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);

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
          <span>Manila Session 2027</span>
          <span className="mono text-xs">EVENT DESK #{eventId}</span>
        </div>
      </header>

      <section className="arena-stage" aria-live="polite">
        <div className="arena-stage-meta">
          <span className="arena-state">
            <span className="status-dot" /> Floor Standby & Warm-up
          </span>
          <span className="mono">INTERMISSION IN PROGRESS</span>
        </div>

        <h1>
          ONE FLOOR.<br />
          EVERY POSSIBILITY.
        </h1>

        <div className="arena-crew-origin">
          <span className="country-code mono">NEXT</span>
          <span>Monster Crew Championship · 16:00 PHT</span>
        </div>
      </section>

      <footer className="arena-bottom">
        <div>
          <span className="eyebrow">Tag Your Moments</span>
          <strong>#WSB2027 · #REPRESENTYOURWORLD</strong>
          <span>Live updates streaming at wsbchampionships.com/live</span>
        </div>
        <span className="arena-bottom-slogan">
          THE STAGE<br />
          IS YOURS.
        </span>
      </footer>

      <div className="arena-preview-controls">
        <span>Arena Holding Display · Event #{eventId}</span>
        <Link href={`/console/${eventId}/broadcast`}>
          Broadcast Desk <Arrow diagonal />
        </Link>
        <Link href={`/arena-live/${eventId}`} className="ml-auto">
          Return to Stage HUD <Arrow diagonal />
        </Link>
      </div>
    </main>
  );
}
