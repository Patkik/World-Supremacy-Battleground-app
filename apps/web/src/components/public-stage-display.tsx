"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Arrow } from "@/components/ui";
import { apiBase } from "@/lib/connected-api";
import { pollStage, type StageProjection } from "@/lib/public-stage";

export function PublicStageDisplay({ eventId, holding = false }: { eventId: string; holding?: boolean }) {
  return <StageDisplay key={eventId} eventId={eventId} holding={holding} />;
}

function StageDisplay({ eventId, holding }: { eventId: string; holding: boolean }) {
  const [projection, setProjection] = useState<StageProjection | null>(null);
  const [lastSuccess, setLastSuccess] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    return pollStage({
      visible: () => document.visibilityState !== "hidden",
      load: async signal => {
        const response = await fetch(`${apiBase}/v1/events/${encodeURIComponent(eventId)}/live`, { cache: "no-store", signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]) });
        if (!response.ok) throw new Error("unavailable");
        return response.json();
      },
      accept: value => { setProjection(value); setLastSuccess(Date.now()); setFailed(false); },
      fail: () => setFailed(true),
    });
  }, [eventId]);

  const performers = projection?.published ? projection.performers : [];
  const hasLive = projection?.published && performers.length > 0;
  const freshness = failed ? lastSuccess ? "CONNECTION LOST · LAST CONFIRMED STATE" : "EVENT DISPLAY UNAVAILABLE" : lastSuccess ? "LIVE DATA · REFRESHING" : "CONNECTING TO EVENT DISPLAY";

  return <main id="main-content" className="arena-display">
    <Image src="/images/dance-hero.png" alt="" fill sizes="100vw" className="arena-background" priority />
    <div className="arena-shade" />
    <header className="arena-header">
      <div className="arena-brand"><Image src="/brand/wsb-logo.png" className="brand-mark-white" alt="World Supremacy Battlegrounds" width={100} height={100} /><span>WORLD SUPREMACY<br />BATTLEGROUNDS</span></div>
      <div className="arena-event-label"><span>{projection?.published ? `${projection.chapter} · ${projection.event}` : `Event Display · ${eventId}`}</span><span className="mono text-xs" role="status">{freshness}</span></div>
    </header>
    <section className="arena-stage" aria-live="polite">
      <div className="arena-stage-meta"><span className="arena-state"><span className="status-dot" />{hasLive ? projection?.held ? "Stage on hold" : "Now performing" : "Awaiting published stage"}</span></div>
      {hasLive ? <div className="space-y-8">{performers.map((performer, index) => <article key={`${performer.crew}/${index}`}><h1>{performer.crew}</h1><p className="arena-crew-origin">{performer.division}</p></article>)}</div> : <h1>{holding ? "The next moment belongs to the stage." : projection?.published ? "No crew is currently performing." : "Event display is not live."}</h1>}
      {failed && <p role="status" className="text-sm">{lastSuccess ? `Last confirmed at ${new Date(lastSuccess).toLocaleTimeString()}. ` : "No confirmed stage state is available. "}Reconnecting automatically.</p>}
    </section>
    <footer className="arena-bottom"><div><span className="eyebrow">{projection?.published ? "Event stage" : "Public display"}</span><strong>{projection?.published ? projection.event : "Waiting for an authorized stage"}</strong><span>{projection?.published ? projection.chapter : "A chapter director can publish an active stage from the event console."}</span></div><span className="arena-bottom-slogan">WORLD<br />ON STAGE.</span></footer>
    <nav className="arena-preview-controls" aria-label="Event display views">
      <span>Event display · {eventId}</span><Link href={`/console/${encodeURIComponent(eventId)}/broadcast`}>Stage display settings <Arrow diagonal /></Link><Link href={`/arena-live/${encodeURIComponent(eventId)}/results`}>Published results <Arrow diagonal /></Link><Link href={`/arena-live/${encodeURIComponent(eventId)}/bracket`}>Battle bracket <Arrow diagonal /></Link><Link href={`/arena-live/${encodeURIComponent(eventId)}/holding`}>Holding view <Arrow diagonal /></Link>
    </nav>
  </main>;
}
