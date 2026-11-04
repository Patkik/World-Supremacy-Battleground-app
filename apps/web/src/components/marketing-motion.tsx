"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { MOTION_PREFERENCE_KEY } from "./motion-preference";
import { LandingEntrance } from "./landing-entrance";

export type HeroIntroControls = { play: () => void; finish: () => void };

const MotionEngine = dynamic(() => import("./marketing-motion-engine").catch(() => ({ default: () => null })), {
  ssr: false,
  loading: () => null,
});

export function MarketingMotion({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [preferenceReady, setPreferenceReady] = useState(false);
  const [engineEnabled, setEngineEnabled] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [saveData, setSaveData] = useState(false);
  const [entered, setEntered] = useState(false);
  const [motionReady, setMotionReady] = useState(false);
  const enteredRef = useRef(false);
  const intro = useRef<HeroIntroControls | null>(null);
  const onIntroReady = useCallback((controls: HeroIntroControls | null) => {
    intro.current = controls;
    setMotionReady(!!controls);
    // A late chunk after skip/timeout must not hide an already usable hero.
    if (enteredRef.current) controls?.finish();
  }, []);
  const enter = useCallback(() => {
    enteredRef.current = true;
    setEntered(true);
    intro.current?.play();
  }, []);

  useEffect(() => {
    try {
      setPaused(sessionStorage.getItem(MOTION_PREFERENCE_KEY) === "true");
    } catch {}
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const { connection } = navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    };
    setSaveData(!!connection?.saveData || ["slow-2g", "2g"].includes(connection?.effectiveType ?? ""));
    const preference = (event: Event) =>
      setPaused(!!(event as CustomEvent<{ paused: boolean }>).detail.paused);
    document.addEventListener("wsb:motion-preference", preference);
    setPreferenceReady(true);
    return () => document.removeEventListener("wsb:motion-preference", preference);
  }, []);

  useEffect(() => {
    if (!preferenceReady || paused) {
      setEngineEnabled(false);
      return;
    }
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateEngine = () => {
      setReduced(reducedMotion.matches);
      setEngineEnabled(!reducedMotion.matches);
    };
    updateEngine();
    reducedMotion.addEventListener("change", updateEngine);
    return () => reducedMotion.removeEventListener("change", updateEngine);
  }, [preferenceReady, paused]);

  useEffect(() => {
    document.dispatchEvent(new CustomEvent("wsb:motion-change", { detail: { paused: paused || !entered } }));
  }, [paused, entered]);

  return (
    <>
      <div ref={root} className="marketing-motion" data-motion={paused || !entered ? "paused" : "active"} data-entrance={entered ? "complete" : "preparing"}>
        {children}
        {engineEnabled && !paused && <MotionEngine root={root} onIntroReady={onIntroReady} />}
      </div>
      {!entered && (
        <LandingEntrance
          root={root}
          motionReady={motionReady}
          danceAllowed={preferenceReady && !paused && !reduced && !saveData}
          quiet={paused || reduced}
          onComplete={enter}
        />
      )}
    </>
  );
}
