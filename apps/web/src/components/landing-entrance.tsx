"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import "../app/landing-entrance.css";

type Check = "waiting" | "ready" | "fallback";
const DANCE_PHRASE_MS = 1600;

/** Original filled silhouette: overlapping anatomical shapes, not stroked limbs. */
function DancerSilhouette() {
  return <svg className="entrance-dancer" viewBox="0 0 280 360" aria-hidden="true" focusable="false"
    style={{ "--dance-phrase": `${DANCE_PHRASE_MS}ms` } as CSSProperties}>
    <g className="dancer-body" fill="currentColor">
      <g className="dancer-leg-back">
        <path d="M133 193C143 188 157 192 160 204L164 249C164 260 154 268 143 264L130 224Z"/>
        <g className="dancer-calf-back">
          <path d="M146 246C154 243 164 248 164 256L162 303 158 317H141L136 261C135 253 139 249 146 246Z"/>
          <g className="dancer-foot-back"><path d="M141 307H161L174 316C178 322 174 328 168 328H144C138 327 136 323 139 315Z"/></g>
        </g>
      </g>
      <g className="dancer-leg-front">
        <path d="M108 192C117 187 137 194 137 205L126 255C123 267 104 268 101 256L103 214Z"/>
        <g className="dancer-calf-front">
          <path d="M108 247C116 244 126 250 125 260L118 311 116 321H101L99 261C99 253 102 249 108 247Z"/>
          <g className="dancer-foot-front"><path d="M101 310H118L124 324C126 330 123 334 117 334H87C82 333 81 328 87 325L100 316Z"/></g>
        </g>
      </g>
      <g className="dancer-upper">
        <path d="M118 99L118 88 140 87 143 99 157 107C166 113 164 130 159 147L153 170 157 199C143 212 114 211 100 198L105 166 98 131C95 117 103 105 118 99Z"/>
        <g className="dancer-head"><path transform="translate(132 94) scale(.76) translate(-132 -94)" d="M111 64C111 49 120 40 132 41 146 41 153 51 152 65L150 79C147 89 140 96 131 94 120 92 115 84 114 75L110 72Z"/></g>
        <g className="dancer-arm-left">
          <path d="M104 107C95 105 88 113 84 124L73 151C69 162 77 169 86 165L104 140C113 129 116 114 104 107Z"/>
          <g className="dancer-forearm-left"><path d="M75 152C81 148 89 153 89 160L87 193 91 202 89 213C87 216 84 215 83 212L81 205 79 216C76 220 72 216 73 212L72 203C68 198 68 193 70 188L69 163C69 158 71 154 75 152Z"/></g>
        </g>
        <g className="dancer-arm-right">
          <path d="M151 106C161 103 168 111 171 120L183 145C188 154 183 163 174 162L156 143C146 132 141 112 151 106Z"/>
          <g className="dancer-forearm-right"><path d="M173 147C179 144 186 148 188 154L201 179 209 183 216 191C218 195 214 198 211 195L205 190 209 199C209 203 205 204 202 200L197 194C190 192 188 188 187 183L171 162C167 156 168 151 173 147Z"/></g>
        </g>
      </g>
    </g>
  </svg>;
}

export function LandingEntrance({ root, motionReady, quiet, onComplete }: {
  root: RefObject<HTMLDivElement | null>;
  motionReady: boolean;
  quiet: boolean;
  onComplete: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [checks, setChecks] = useState<Check[]>(["ready", "waiting", "waiting"]);
  const [phase, setPhase] = useState("loading");
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
    // Use the actual CSS animation clock so hydration time does not cut a step short.
    const dancer = dialog.current?.querySelector(".dancer-body");
    const elapsed = Number(dancer?.getAnimations()[0]?.currentTime ?? 0);
    const phraseEnd = Math.max(DANCE_PHRASE_MS, Math.ceil(elapsed / DANCE_PHRASE_MS) * DANCE_PHRASE_MS);
    const timer = window.setTimeout(() => setPhase("settling"), quiet || skipped ? 0 : phraseEnd - elapsed);
    return () => window.clearTimeout(timer);
  }, [managed, ready, expired, skipped, quiet]);

  useEffect(() => {
    if (phase !== "settling") return;
    const timer = window.setTimeout(() => setPhase("leaving"), quiet ? 0 : 120);
    return () => window.clearTimeout(timer);
  }, [phase, quiet]);

  useEffect(() => {
    if (phase !== "leaving") return;
    // Matches the CSS exit, with a timer so a missing animation event cannot trap navigation.
    const timer = window.setTimeout(onComplete, quiet ? 80 : 500);
    return () => window.clearTimeout(timer);
  }, [phase, quiet, onComplete]);

  return <><noscript><style>{".landing-entrance{display:none!important}"}</style></noscript><dialog open ref={dialog} className="landing-entrance" data-managed={managed} data-phase={phase} data-quiet={quiet}
    aria-labelledby="entrance-title" aria-describedby="entrance-status"
    onCancel={event => { event.preventDefault(); setSkipped(true); }}>
    <div className="entrance-top"><span>WSB</span><span>WORLD SUPREMACY<br/>BATTLEGROUNDS</span></div>
    <div className="entrance-center">
      <div className="entrance-stage"><DancerSilhouette/><span className="entrance-floor"/></div>
      <h2 id="entrance-title">SETTING THE STAGE.</h2>
      <p id="entrance-status" role="status">{skipped ? "Entering the site" : expired ? "Opening with available assets" : ready ? fallback ? "Ready with a fallback" : "Ready. Let’s move." : "Preparing your first view"}</p>
      <div className="entrance-progress" role="progressbar" aria-label="Landing page checks" aria-valuemin={0} aria-valuemax={4} aria-valuenow={count} aria-valuetext={`${count} of 4 checks complete${fallback ? "; using available assets" : ""}`}>
        {allChecks.map((check, index) => <span key={index} data-complete={check !== "waiting"}/>) }
      </div>
      <div className="entrance-checks" aria-hidden="true"><span>PAGE / TYPE / IMAGE / ENTRANCE</span><span>{count} / 4</span></div>
    </div>
    <div className="entrance-bottom"><span>FROM THE STREETS. TO THE WORLD.</span><button type="button" autoFocus onClick={() => setSkipped(true)}>Enter site <span aria-hidden="true">↗</span></button></div>
  </dialog></>;
}
