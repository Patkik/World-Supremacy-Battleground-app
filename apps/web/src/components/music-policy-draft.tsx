"use client";
import { useEffect, useState, type FormEvent } from "react";
import { ApiError, connectedRequest, segment } from "@/lib/connected-api";
import { registrationCommand } from "@/lib/registration-command";

type Draft = { revision: number; max_duration_ms: number; grace_ms: number; source: string; rules_version: string; status: "draft" };
function milliseconds(value: string): number | null {
  if (!/^\d+(?:\.\d{1,3})?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  const result = Number(whole) * 1000 + Number(fraction.padEnd(3, "0"));
  return Number.isSafeInteger(result) ? result : null;
}

export function MusicPolicyDraft({ chapterId, eventId, divisionId, uid, canEdit }: { chapterId: string; eventId: string; divisionId: string; uid: string; canEdit: boolean }) {
  const path = `/v1/chapters/${segment(chapterId)}/events/${segment(eventId)}/divisions/${segment(divisionId)}/music-policy`;
  const [draft, setDraft] = useState<Draft | null>(null);
  const [duration, setDuration] = useState(""); const [grace, setGrace] = useState(""); const [source, setSource] = useState("");
  const [loading, setLoading] = useState(true); const [ready, setReady] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  useEffect(() => {
    let alive = true;
    connectedRequest<Draft | null>(path, undefined, "GET", uid).then(value => {
      if (!alive) return;
      setDraft(value); setDuration(value ? String(value.max_duration_ms / 1000) : ""); setGrace(value ? String(value.grace_ms / 1000) : ""); setSource(value?.source ?? ""); setReady(true);
    }).catch(() => { if (alive) setError("Draft music policy could not be loaded. Refresh to try again."); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [path, uid]);
  async function save(event: FormEvent) {
    event.preventDefault(); setError(""); setMessage("");
    const max = milliseconds(duration); const extra = milliseconds(grace);
    if (max === null || extra === null || max <= 0 || max + extra > 86400000 || !source.trim()) { setError("Enter a positive duration, a non-negative grace and a source. Use at most three decimal places in seconds."); return; }
    setBusy(true);
    try {
      const value = await registrationCommand<Draft>(path, { expected_revision: draft?.revision ?? 0, max_duration_ms: max, grace_ms: extra, source: source.trim() }, "POST", false, uid);
      setDraft(value); setSource(value.source); setMessage("Draft saved. It does not change readiness or approve music.");
    } catch (reason) { setError(reason instanceof ApiError && reason.status === 409 ? "The draft changed or the division is locked. Refresh before trying again." : reason instanceof Error ? reason.message : "The draft could not be saved."); }
    finally { setBusy(false); }
  }
  return <section className="panel" aria-labelledby="music-policy-heading"><h2 id="music-policy-heading">Draft music guidance</h2>
    <p>These values are unapproved draft guidance. They are not applied to submissions or entry readiness.</p>
    {loading ? <p role="status">Loading draft…</p> : <>{draft ? <p>Draft revision {draft.revision} · Event rules version {draft.rules_version}</p> : <p>No draft guidance saved.</p>}{canEdit && <form onSubmit={save}>
      <label htmlFor="music-max-seconds">Maximum duration in seconds</label><input id="music-max-seconds" type="number" min="0.001" step="0.001" value={duration} onChange={event => setDuration(event.target.value)} required disabled={busy} />
      <label htmlFor="music-grace-seconds">Grace in seconds</label><input id="music-grace-seconds" type="number" min="0" step="0.001" value={grace} onChange={event => setGrace(event.target.value)} required disabled={busy} />
      <label htmlFor="music-policy-source">Source or evidence</label><textarea id="music-policy-source" value={source} maxLength={500} onChange={event => setSource(event.target.value)} required disabled={busy} />
      <button className="button button-outline" disabled={busy || !ready} type="submit">{busy ? "Saving…" : "Save draft guidance"}</button>
    </form>}{!canEdit && draft && <p>Maximum {draft.max_duration_ms / 1000} seconds; grace {draft.grace_ms / 1000} seconds. Source: {draft.source}</p>}</>}
    {message && <p role="status">{message}</p>}{error && <p role="alert" className="form-error">{error}</p>}
  </section>;
}
