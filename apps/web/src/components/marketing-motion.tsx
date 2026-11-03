"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { MOTION_PREFERENCE_KEY } from "./motion-preference";

const MotionEngine = dynamic(() => import("./marketing-motion-engine"), {
  ssr: false,
  loading: () => null,
});

export function MarketingMotion({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [preferenceReady, setPreferenceReady] = useState(false);
  const [engineEnabled, setEngineEnabled] = useState(false);

  useEffect(() => {
    try {
      setPaused(sessionStorage.getItem(MOTION_PREFERENCE_KEY) === "true");
    } catch {}
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
    const updateEngine = () => setEngineEnabled(!reducedMotion.matches);
    updateEngine();
    reducedMotion.addEventListener("change", updateEngine);
    return () => reducedMotion.removeEventListener("change", updateEngine);
  }, [preferenceReady, paused]);

  useEffect(() => {
    document.dispatchEvent(new CustomEvent("wsb:motion-change", { detail: { paused } }));
  }, [paused]);

  return (
    <div ref={root} className="marketing-motion" data-motion={paused ? "paused" : "active"}>
      {children}
      {engineEnabled && !paused && <MotionEngine root={root} />}
    </div>
  );
}
