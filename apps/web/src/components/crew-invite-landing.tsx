"use client";
import { useEffect, useState } from "react";
import { AcceptCrewInvite } from "./accept-crew-invite";

const validToken = (value: string) => /^[A-Za-z0-9_-]{32,128}$/.test(value);
const validHandle = (value: string) => /^[a-f0-9-]{36}$/.test(value);
type Landing = { token: string; chapter: string; crew: string; returnPath: string; handle: string };
export function CrewInviteLanding({ chapter, crew, legacyToken }: { chapter: string | null; crew: string | null; legacyToken?: string }) {
  const [landing, setLanding] = useState<Landing | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    try {
      if (!chapter || !crew || chapter.length > 200 || crew.length > 200 || chapter.includes("/") || crew.includes("/")) throw new Error("This invitation is missing its crew or chapter. Ask your manager for a new link.");
      const url = new URL(window.location.href);
      const fragment = url.hash.slice(1);
      let handle = url.searchParams.get("intent") || "";
      let token = legacyToken || fragment;
      if (token) {
        if (!validToken(token)) throw new Error("This invitation link is invalid. Ask your manager for a new link.");
        const prior = legacyToken && validHandle(handle) ? JSON.parse(sessionStorage.getItem(`wsb-crew-invite:${handle}`) || "null") as { token?: unknown; chapter?: unknown; crew?: unknown } | null : null;
        if (!prior || prior.token !== token || prior.chapter !== chapter || prior.crew !== crew) {
          handle = crypto.randomUUID();
          sessionStorage.setItem(`wsb-crew-invite:${handle}`, JSON.stringify({ token, chapter, crew }));
        }
      } else {
        if (!validHandle(handle)) throw new Error("This invitation is unavailable in this tab. Open the original link again.");
        const stored = JSON.parse(sessionStorage.getItem(`wsb-crew-invite:${handle}`) || "null") as { token?: unknown; chapter?: unknown; crew?: unknown } | null;
        if (!stored || typeof stored.token !== "string" || !validToken(stored.token) || stored.chapter !== chapter || stored.crew !== crew) throw new Error("This invitation is unavailable in this tab. Open the original link again.");
        token = stored.token;
      }
      const params = new URLSearchParams({ chapter, crew, intent: handle });
      const returnPath = `/invite/accept?${params.toString()}`;
      window.history.replaceState(window.history.state, "", returnPath);
      setLanding({ token, chapter, crew, returnPath, handle });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to open this invitation. Open the original link again."); }
  }, [chapter, crew, legacyToken]);
  if (error) return <main id="main-content" className="system-page"><p role="alert">{error}</p></main>;
  if (!landing) return <main id="main-content" className="system-page"><p role="status">Opening invitation…</p></main>;
  return <AcceptCrewInvite token={landing.token} chapter={landing.chapter} crewId={landing.crew} returnPath={landing.returnPath} onComplete={() => { try { sessionStorage.removeItem(`wsb-crew-invite:${landing.handle}`); } catch {} }} />;
}
