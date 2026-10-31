"use client";
import { useEffect, useState, type FormEvent } from "react";
import { ApiError, connectedRequest, segment } from "@/lib/connected-api";
import { registrationCommand } from "@/lib/registration-command";

type Lineup = { revision: number; entry_ids: string[]; reason: string };
export function StageLineup({ base, stage, uid, director }: { base: string; stage: string; uid: string; director: boolean }) {
  const [saved, setSaved] = useState<Lineup | null>(null);
  const [draft, setDraft] = useState("");
  const [reason, setReason] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const path = `${base}/stages/${segment(stage)}/lineup`;
  function show(value: Lineup | null) { setSaved(value); setDraft(value?.entry_ids.join("\n") || ""); setReason(""); setLoaded(true); }
  async function refresh() {
    setBusy(true); setError(""); setNotice("");
    try { show(await connectedRequest<Lineup | null>(path, undefined, "GET", uid)); }
    catch (error) { setLoaded(false); setSaved(null); setError(error instanceof Error ? error.message : "Unable to load lineup draft."); }
    finally { setBusy(false); }
  }
  useEffect(() => { void refresh(); }, [path, uid]);
  async function save(event: FormEvent) {
    event.preventDefault(); if (!loaded) return;
    const entry_ids = draft.split(/\r?\n/).map(value => value.trim()).filter(Boolean);
    if (entry_ids.length > 200 || new Set(entry_ids).size !== entry_ids.length) { setError("Enter up to 200 distinct entry IDs in order."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      await registrationCommand<Lineup>(`${base}/stage-lineup`, { stage_id: stage, expected_revision: saved?.revision || 0, entry_ids, reason: reason.trim() }, "POST", false, uid);
      show(await connectedRequest<Lineup | null>(path, undefined, "GET", uid));
      setNotice("Draft command accepted. Current saved order is shown. It has not been published to crews.");
    } catch (error) { setError(error instanceof ApiError && error.status === 409 ? "The draft changed, the order is unchanged, or the stage is not held and clear of performances. Refresh and review before saving." : error instanceof Error ? error.message : "Unable to save lineup draft."); }
    finally { setBusy(false); }
  }
  return <section className="panel stage-lineup"><h2>Stage lineup draft</h2><p>Internal planning order. This draft is not published to crews, does not send notifications and does not control performance starts. Readiness is checked separately when entries move.</p>
    {loaded ? saved ? <><p>Draft revision {saved.revision}</p>{saved.entry_ids.length ? <ol className="connected-list">{saved.entry_ids.map((id, index) => <li key={id}><strong>{index + 1}. {id}</strong></li>)}</ol> : <p>The saved draft is empty.</p>}<p>Last edit reason: {saved.reason}</p></> : <p>No lineup draft has been saved.</p> : <p role="status">{busy ? "Loading lineup draft…" : "Lineup draft unavailable."}</p>}
    {director && <form onSubmit={save}><label htmlFor="lineup-entry-ids">Entry IDs in planned order</label><textarea id="lineup-entry-ids" rows={6} maxLength={40200} value={draft} disabled={busy || !loaded} onChange={event => setDraft(event.target.value)} aria-describedby="lineup-help"/><p id="lineup-help" className="fineprint">One approved event entry ID per line, up to 200. An empty list clears the draft. Put the stage on hold and complete active performances before editing.</p><label htmlFor="lineup-reason">Reason for draft change</label><input id="lineup-reason" required maxLength={500} value={reason} disabled={busy || !loaded} onChange={event => setReason(event.target.value)}/><button className="button button-volt" style={{minHeight:56}} disabled={busy || !loaded}>Save lineup draft</button></form>}
    <button type="button" className="button button-outline" style={{minHeight:56}} disabled={busy} onClick={() => void refresh()}>Refresh lineup draft</button>
    {error && <p role="alert" className="form-error">{error}</p>}{notice && <p role="status">{notice}</p>}
  </section>;
}
