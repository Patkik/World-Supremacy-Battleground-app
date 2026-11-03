"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { connectedRequest, segment } from "@/lib/connected-api";

type Advisory = { state: "no_submission" | "no_draft_policy" | "stale_draft" | "within_draft" | "exceeds_draft"; advisory: true; duration_ms?: number; max_duration_ms?: number; grace_ms?: number; policy_revision?: number; submission_version?: number };
export function MusicAdvisory({ chapterId, eventId, entryId, uid }: { chapterId: string; eventId: string; entryId: string; uid: string }) {
  const path = `/v1/chapters/${segment(chapterId)}/events/${segment(eventId)}/entries/${segment(entryId)}/music-submission/advisory`;
  const [result, setResult] = useState<Advisory | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const active = useRef(0);
  const load = useCallback(async () => {
    const id = ++active.current; setBusy(true); setError("");
    try { const data = await connectedRequest<Advisory>(path, undefined, "GET", uid); if (id === active.current) setResult(data); }
    catch { if (id === active.current) { setResult(null); setError("Draft comparison is unavailable. Try again."); } }
    finally { if (id === active.current) setBusy(false); }
  }, [path, uid]);
  useEffect(() => { void load(); return () => { active.current++; }; }, [load]);
  const label = result?.state === "no_submission" ? "No track has been submitted." : result?.state === "no_draft_policy" ? "No draft duration guidance is saved for this division." : result?.state === "stale_draft" ? "The draft refers to an older event rules version; no comparison is shown." : result?.state === "within_draft" ? "Measured duration is within the draft limit and grace." : result?.state === "exceeds_draft" ? "Measured duration exceeds the draft limit and grace." : "";
  return <section className="panel" aria-labelledby="music-advisory-heading"><h2 id="music-advisory-heading">Draft duration comparison</h2>
    <p>This is an advisory comparison with unapproved draft guidance. It does not establish compliance or change readiness.</p>
    {busy ? <p role="status">Checking…</p> : result && <><p role="status">{label}</p>{result.duration_ms !== undefined && <p>Measured: {(result.duration_ms / 1000).toFixed(3)} seconds{result.max_duration_ms !== undefined && result.grace_ms !== undefined ? ` · Draft limit: ${(result.max_duration_ms / 1000).toFixed(3)} seconds · Draft grace: ${(result.grace_ms / 1000).toFixed(3)} seconds` : ""}.</p>}{result.policy_revision !== undefined && <p className="fineprint">Draft revision {result.policy_revision}; submission version {result.submission_version}. Refresh after changes.</p>}</>}
    {error && <p className="form-error" role="alert">{error}</p>}<button type="button" className="button button-outline" disabled={busy} onClick={() => void load()}>Refresh comparison</button>
  </section>;
}
