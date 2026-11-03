"use client";
import { useEffect, useState, type FormEvent } from "react";
import { ApiError, connectedPage, connectedRequest, segment } from "@/lib/connected-api";
import { registrationCommand } from "@/lib/registration-command";

type Access = { marshal_uids: string[]; access_revision: number };

export function StageAssignments({ base, stage, uid }: { base: string; stage: string; uid: string }) {
  const [saved, setSaved] = useState<Access | null>(null);
  const [draft, setDraft] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [candidates, setCandidates] = useState<string[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [candidateBusy, setCandidateBusy] = useState(false);
  const [candidateError, setCandidateError] = useState("");
  async function loadCandidates(next: string | null = null) {
    setCandidateBusy(true); setCandidateError("");
    try {
      const page = await connectedPage<string>(`${base}/staff/eligible-stage-marshals`, next, uid);
      if (!Array.isArray(page.items) || page.items.some(item => typeof item !== "string" || !item || item.length > 200 || /[\r\n]/.test(item)) || (page.next_page !== null && typeof page.next_page !== "string")) throw new Error("The marshal directory response is invalid.");
      setCandidates(previous => next ? [...new Set([...previous, ...page.items])] : page.items);
      setCursor(page.next_page);
    } catch (cause) { if (!next) { setCandidates([]); setCursor(null); } setCandidateError(cause instanceof Error ? cause.message : "Unable to load marshals."); }
    finally { setCandidateBusy(false); }
  }
  function toggleCandidate(value: string) {
    const current = draft.split(/\r?\n/).map(item => item.trim()).filter(Boolean);
    setDraft((current.includes(value) ? current.filter(item => item !== value) : [...current, value]).join("\n"));
  }
  async function refresh() {
    setBusy(true); setError(""); setNotice("");
    try {
      const value = await connectedRequest<Access>(`${base}/stages/${segment(stage)}`, undefined, "GET", uid);
      setSaved(value); setDraft(value.marshal_uids.join("\n"));
    } catch (reason) { setSaved(null); setError(reason instanceof Error ? reason.message : "Unable to load stage assignments."); }
    finally { setBusy(false); }
  }
  useEffect(() => { void refresh(); void loadCandidates(); }, [base, stage, uid]);
  async function save(event: FormEvent) {
    event.preventDefault(); if (!saved) return;
    const marshal_uids = draft.split(/\r?\n/).map(value => value.trim()).filter(Boolean).sort();
    if (marshal_uids.length > 100 || new Set(marshal_uids).size !== marshal_uids.length) {
      setError("Enter up to 100 distinct marshal account IDs, one per line."); return;
    }
    setBusy(true); setError(""); setNotice("");
    try {
      await registrationCommand<Access>(`${base}/stage-marshals`, { stage_id: stage, expected_revision: saved.access_revision, marshal_uids, reason: reason.trim() }, "POST", false, uid);
      // A retried receipt can describe an older revision. Reload current authority.
      const current = await connectedRequest<Access>(`${base}/stages/${segment(stage)}`, undefined, "GET", uid);
      setSaved(current); setDraft(current.marshal_uids.join("\n"));
      setReason("");
      setNotice("Assignment command accepted. Current saved access is shown below.");
    } catch (reason) {
      setError(reason instanceof ApiError && reason.status === 409 ? "Assignments changed. Refresh saved assignments and review the current list before saving again." : reason instanceof Error ? reason.message : "Unable to save stage assignments.");
    } finally { setBusy(false); }
  }
  return <section className="panel stage-assignments" aria-labelledby="stage-access-heading">
    <h2 id="stage-access-heading">Stage marshal access</h2>
    <p>Directors can assign active marshals who already belong to this chapter and event. Removing an ID revokes that marshal’s access to this stage.</p>
    {saved ? <><p>Saved access revision {saved.access_revision}</p>{saved.marshal_uids.length ? <ul className="connected-list">{saved.marshal_uids.map(value => <li key={value}>{value}</li>)}</ul> : <p>No marshals assigned. Directors retain access.</p>}</> : <p role="status">{busy ? "Loading saved assignments…" : "Saved assignments are unavailable."}</p>}
    <form onSubmit={save}>
      <fieldset disabled={busy || candidateBusy || !saved}><legend>Available event marshals</legend>
        {candidates.map(value => <label key={value} style={{display:"block"}}><input type="checkbox" checked={draft.split(/\r?\n/).map(item => item.trim()).includes(value)} onChange={() => toggleCandidate(value)}/> {value}</label>)}
        {!candidates.length && <p>{candidateBusy ? "Loading marshals..." : "No eligible marshals loaded. More pages may be available."}</p>}
        {cursor && <button type="button" onClick={() => void loadCandidates(cursor)}>Load more marshals</button>}
        <button type="button" onClick={() => void loadCandidates()}>Refresh marshal list</button>
      </fieldset>
      <p className="fineprint">Eligibility can change after this list loads; saving checks current access again. The list shows account IDs.</p>
      {candidateError && <p role="alert" className="form-error">{candidateError}</p>}
      <label htmlFor="stage-marshal-ids">Marshal account IDs</label>
      <textarea id="stage-marshal-ids" rows={5} maxLength={20100} value={draft} disabled={busy || !saved} onChange={event => setDraft(event.target.value)} aria-describedby="stage-access-help"/>
      <p id="stage-access-help" className="fineprint">One ID per line, up to 100. An empty list removes all marshal access. Changes require a connection.</p>
      <label htmlFor="stage-access-reason">Reason for changing marshal access</label><textarea id="stage-access-reason" rows={3} minLength={8} maxLength={1000} required value={reason} onChange={event => setReason(event.target.value)} disabled={busy || !saved}/>
      <div className="connected-actions"><button className="button button-volt" disabled={busy || !saved || reason.trim().length < 8} style={{minHeight:56}}>{busy ? "Please wait…" : draft.trim() ? "Save marshal assignments" : "Remove all marshal access"}</button><button type="button" className="button button-outline" disabled={busy} onClick={() => void refresh()} style={{minHeight:56}}>Refresh saved assignments</button></div>
    </form>
    {error && <p role="alert" className="form-error">{error}</p>}{notice && <p role="status">{notice}</p>}
  </section>;
}
