"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import "../app/landing-entrance.css";

type Check = "waiting" | "ready" | "fallback";
const DANCE_START_GRACE_MS = 450;
const DANCE_FINISH_GRACE_MS = 3000;

export function LandingEntrance({ root, motionReady, danceAllowed, quiet, onComplete }: {
  root: RefObject<HTMLDivElement | null>;
  motionReady: boolean;
  danceAllowed: boolean;
  quiet: boolean;
  onComplete: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [checks, setChecks] = useState<Check[]>(["ready", "waiting", "waiting"]);
  const [phase, setPhase] = useState("loading");
  const [dance, setDance] = useState<"pending" | "playing" | "done" | "unavailable">("pending");
  const [expired, setExpired] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [managed, setManaged] = useState(false);
  const allChecks = [...checks, motionReady || quiet ? "ready" : "waiting"];
  const count = allChecks.filter(check => check !== "waiting").length;
  const ready = count === 4;
  const fallback = expired || checks.includes("fallback");

  useLayoutEffect(() => {
    const element = dialog.current;
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    // Server-render a visible cover, then promote it to a native modal for focus/inertness.
    element?.close();
    element?.showModal();
    setManaged(true);
    return () => {
      element?.close();
      document.documentElement.style.overflow = overflow;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const finish = (index: number, value: Check) => {
      if (alive) setChecks(previous => previous.map((check, i) => i === index ? value : check));
    };
    // Read actual critical font and poster completion. Video is optional and never gates entry.
    Promise.all([document.fonts.load('400 1em Anton'), document.fonts.load('400 1em "Space Grotesk"')])
      .then(values => finish(1, values.every(fonts => fonts.length > 0) ? "ready" : "fallback"))
      .catch(() => finish(1, "fallback"));
    const poster = root.current?.querySelector<HTMLImageElement>(".highlights-poster");
    const loaded = () => finish(2, poster?.naturalWidth ? "ready" : "fallback");
    const failed = () => finish(2, "fallback");
    if (!poster || poster.complete) loaded();
    else { poster.addEventListener("load", loaded); poster.addEventListener("error", failed); }
    const deadline = window.setTimeout(() => setExpired(true), 6500);
    return () => {
      alive = false;
      window.clearTimeout(deadline);
      poster?.removeEventListener("load", loaded);
      poster?.removeEventListener("error", failed);
    };
  }, [root]);

  useEffect(() => {
    if (!managed || (!ready && !expired && !skipped)) return;
    // The decorative clip gets a short chance to start. A stalled decoder
    // or failed download cannot hold the page past the readiness deadline.
    let delay = 0;
    if (danceAllowed && !expired && !skipped) {
      if (dance === "pending") delay = DANCE_START_GRACE_MS;
      if (dance === "playing") delay = DANCE_FINISH_GRACE_MS;
    }
    const timer = window.setTimeout(() => setPhase("leaving"), delay);
    return () => window.clearTimeout(timer);
  }, [managed, ready, expired, skipped, danceAllowed, dance]);

  useEffect(() => {
    if (phase !== "leaving") return;
    // Matches the CSS exit, with a timer so a missing animation event cannot trap navigation.
    const timer = window.setTimeout(onComplete, quiet ? 80 : 500);
    return () => window.clearTimeout(timer);
  }, [phase, quiet, onComplete]);

  return <><noscript><style>{".landing-entrance{display:none!important}"}</style></noscript><dialog open ref={dialog} className="landing-entrance" data-managed={managed} data-phase={phase} data-quiet={quiet}
    aria-labelledby="entrance-title" aria-describedby="entrance-status"
    onCancel={event => { event.preventDefault(); setSkipped(true); }}>
    <div className="entrance-wall" aria-hidden="true" />
    <div className="entrance-top">
      <span className="entrance-wordmark" aria-hidden="true">WSB</span>
      <span>WORLD SUPREMACY<br />BATTLEGROUNDS</span>
    </div>
    <div className="entrance-center">
      <div className="entrance-stage" aria-hidden="true">
        <span className="entrance-record" />
        <span className="entrance-floor" />
        <div className="entrance-dancer">
          {danceAllowed && !skipped && dance !== "unavailable" && (
            <video
              autoPlay
              muted
              playsInline
              loop={!ready}
              preload="auto"
              poster="/images/entrance-dancer.webp"
              src="/images/entrance-dancer.mp4"
              onPlaying={() => setDance("playing")}
              onEnded={() => setDance("done")}
              onError={() => setDance("unavailable")}
            />
          )}
        </div>
        <span className="entrance-sticker">BREAK<br />SESSION</span>
      </div>
      <div className="entrance-copy">
        <h2 id="entrance-title">SETTING <span>THE STAGE.</span></h2>
        <p id="entrance-status" role="status">{skipped ? "Entering the site" : expired ? "Opening with available assets" : ready ? fallback ? "Ready with a fallback" : "Ready. Let’s move." : "Preparing your first view"}</p>
        <div className="entrance-progress" role="progressbar" aria-label="Landing page checks" aria-valuemin={0} aria-valuemax={4} aria-valuenow={count} aria-valuetext={`${count} of 4 checks complete${fallback ? "; using available assets" : ""}`}>
          {allChecks.map((check, index) => <span key={index} data-complete={check !== "waiting"} />)}
        </div>
        <div className="entrance-checks" aria-hidden="true"><span>PAGE / TYPE / IMAGE / ENTRANCE</span><span>{count} / 4</span></div>
      </div>
    </div>
    <div className="entrance-bottom"><span>FROM THE STREETS. TO THE WORLD.</span><button type="button" autoFocus onClick={() => setSkipped(true)}>Enter site <span aria-hidden="true">↗</span></button></div>
  </dialog></>;
}
