"use client";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { selectedChapterFor, useWorkspaceSession } from "@/lib/account";
import { connectedRequest, segment } from "@/lib/connected-api";
import { newOperation, queueOperation, type Criteria, type ScoreOperation } from "@/lib/judging/outbox";
import { scoreStore, synchronizeScores } from "@/lib/judging/sync";
import { Brand } from "./ui";

const criteria = [["choreography", "Choreography"], ["musicality", "Musicality"], ["execution", "Execution"], ["stage_presence", "Stage presence"], ["entertainment", "Entertainment"]] as const;
const zero: Criteria = { choreography: 0, musicality: 0, execution: 0, stage_presence: 0, entertainment: 0 };
type State = { schema_version: 1; locked: boolean; revision: number; criteria?: Criteria };

export function ConnectedScorecard({ eventId, entryId }: { eventId: string; entryId: string }) {
  const { user, session, loading, error: accountError } = useWorkspaceSession();
  const [trusted, setTrusted] = useState(false);
  const trustedRef = useRef(false);
  const [values, setValues] = useState<Criteria>(zero);
  const [operation, setOperation] = useState<ScoreOperation | null>(null);
  const [context, setContext] = useState<{ chapter: string; crew: string; revision: number; locked: boolean } | null>(null);
  const [records, setRecords] = useState<ScoreOperation[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("Unsaved draft. Confirm this is a trusted device to save scores.");
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(true);
  const [review, setReview] = useState(false);
  const [dirty, setDirty] = useState(false);
  const reviewDialog = useRef<HTMLDialogElement>(null);
  const scopeGeneration = useRef(0);
  const chapterScope = session && user && session.uid === user.uid ? session.chapter_id : user ? selectedChapterFor(user.uid) : null;
  const scopeKey = `${user?.uid ?? "signed-out"}/${chapterScope ?? "no-chapter"}/${eventId}/${entryId}`;
  const priorScope = useRef(scopeKey);
  useLayoutEffect(() => {
    if (priorScope.current === scopeKey) return;
    priorScope.current = scopeKey;
    ++scopeGeneration.current;
    trustedRef.current = false;
    setTrusted(false); setValues(zero); setOperation(null); setContext(null); setRecords([]);
    setError(""); setMessage("Confirm this is a trusted device to open the scorecard.");
    setBusy(false); setReview(false); setDirty(false);
    reviewDialog.current?.close();
  }, [scopeKey]);
  useEffect(() => { if (review) reviewDialog.current?.showModal(); }, [review]);

  const refreshQueue = useCallback(async () => {
    if (!user || !trusted || !trustedRef.current || priorScope.current !== scopeKey) return;
    const generation = scopeGeneration.current;
    const records = await scoreStore.list(user.uid);
    if (generation === scopeGeneration.current && priorScope.current === scopeKey) setRecords(records.filter(r => r.event === eventId && r.entryId === entryId));
  }, [user, trusted, eventId, entryId, scopeKey]);

  const sync = useCallback(async () => {
    if (!user || !trusted || !trustedRef.current || priorScope.current !== scopeKey) return;
    const generation = scopeGeneration.current;
    try {
      await synchronizeScores(user.uid);
      if (generation === scopeGeneration.current && priorScope.current === scopeKey) {
        await refreshQueue();
        if (generation === scopeGeneration.current && priorScope.current === scopeKey) setError("");
      }
    }
    catch (reason) { if (generation === scopeGeneration.current && priorScope.current === scopeKey) setError(reason instanceof Error ? reason.message : "Scores could not be synchronized."); }
  }, [user, trusted, refreshQueue, scopeKey]);

  useEffect(() => {
    const network = () => { setOnline(navigator.onLine); if (navigator.onLine) void sync(); };
    network(); window.addEventListener("online", network); window.addEventListener("offline", network);
    const interval = window.setInterval(() => { if (navigator.onLine) void sync(); }, 15000);
    return () => { window.removeEventListener("online", network); window.removeEventListener("offline", network); clearInterval(interval); };
  }, [sync]);

  useEffect(() => {
    if (!user || !trusted) return;
    let alive = true;
    setError(""); setBusy(true); setOperation(null); setValues(zero); setContext(null); setRecords([]); setMessage("Loading this account’s scorecard…");
    async function load() {
      const saved = (await scoreStore.list(user!.uid)).filter(r => r.event === eventId && r.entryId === entryId).sort((a, b) => b.createdAt - a.createdAt);
      if (alive) setRecords(saved);
      const latest = saved.find(record => record.chapter === chapterScope);
      if (latest && alive) {
        setOperation(latest); setValues(latest.command.criteria); setDirty(false);
        setContext({ chapter: latest.chapter, crew: latest.command.crew_id, revision: latest.receipt?.score_revision ?? latest.command.expected_revision, locked: false });
        setMessage(`Restored ${latest.state} score from this device.`);
      }
      if (!navigator.onLine && latest) return;
      if (!navigator.onLine) throw new Error("No saved scorecard is available offline. Open and save it while online before disconnecting.");
      if (!session || session.uid !== user!.uid || session.chapter_id !== chapterScope) throw new Error("Confirm your active chapter access, then reload this scorecard.");
      const chapter = session.chapter_id;
      const root = `/v1/chapters/${segment(chapter)}/events/${segment(eventId)}`;
      const detail = await connectedRequest<{crew_id: string; division_id: string}>(`${root}/entries/${segment(entryId)}/scorecard`, undefined, "GET", user!.uid);
      const state = await connectedRequest<State>(`${root}/divisions/${segment(detail.division_id)}/score-state?crew_id=${segment(detail.crew_id)}`, undefined, "GET", user!.uid);
      if (!alive) return;
      setContext({ chapter, crew: detail.crew_id, revision: state.revision, locked: state.locked });
      if (!latest) {
        const draft = newOperation(user!.uid, chapter, eventId, { schema_version: 1, operation_id: crypto.randomUUID(), division_id: detail.division_id, crew_id: detail.crew_id, expected_revision: state.revision, criteria: state.criteria ?? zero, deductions: [] });
        draft.entryId = entryId;
        setOperation(draft); setValues(draft.command.criteria);
        setMessage(state.locked ? "Division locked by the server." : "Ready. Changes stay unsaved until you save a draft.");
      }
    }
    load().catch(reason => { if (alive) setError(reason instanceof Error ? reason.message : "Could not open this scorecard."); }).finally(() => { if (alive) setBusy(false); });
    return () => { alive = false; };
  }, [user, session, chapterScope, trusted, eventId, entryId]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const belongsToCurrentUser = !!user && operation?.owner === user.uid;
  const current = belongsToCurrentUser ? records.find(r => r.key === operation?.key) : undefined;
  const frozen = current && current.state !== "draft";
  const canEdit = trusted && belongsToCurrentUser && !!context && !context.locked && !frozen && !busy;
  async function save(queue: boolean) {
    if (!user || !context || !operation || !canEdit) return;
    const generation = scopeGeneration.current;
    setBusy(true); setError("");
    try {
      const draft = { ...operation, command: { ...operation.command, criteria: { ...values } } };
      if (!navigator.locks) throw new Error("Use a current browser with safe device storage support.");
      const saved = await navigator.locks.request(`wsb-score-sync:${user.uid}`, async () => {
        const stored = (await scoreStore.list(user.uid)).find(r => r.key === draft.key);
        if (stored && stored.state !== "draft") throw new Error("This score was queued in another tab. Reload to view its receipt.");
        await scoreStore.put(draft);
        return queue ? queueOperation(scoreStore, draft) : draft;
      });
      if (generation !== scopeGeneration.current) return;
      setOperation(saved); setDirty(false); setReview(false);
      setMessage(queue ? "Queued on this device. Waiting for a server receipt." : "Draft saved on this device. It has not been submitted.");
      await refreshQueue();
      if (queue) await sync();
    } catch (reason) { if (generation === scopeGeneration.current) setError(reason instanceof Error ? reason.message : "Could not save your score."); }
    finally { if (generation === scopeGeneration.current) setBusy(false); }
  }

  async function startRevision() {
    if (!user || !operation || !context || !current?.receipt) return;
    const generation = scopeGeneration.current;
    setBusy(true); setError("");
    try {
      if (!session || session.uid !== user.uid || session.chapter_id !== context.chapter) throw new Error("Your active chapter changed. Reload this scorecard before revising it.");
      const state = await connectedRequest<State>(`/v1/chapters/${segment(context.chapter)}/events/${segment(eventId)}/divisions/${segment(operation.command.division_id)}/score-state?crew_id=${segment(context.crew)}`, undefined, "GET", user.uid);
      if (generation !== scopeGeneration.current) return;
      if (state.locked) throw new Error("This division is locked. Ask the head judge to review any correction.");
      const draft = newOperation(user.uid, context.chapter, eventId, { ...operation.command, operation_id: crypto.randomUUID(), expected_revision: state.revision, criteria: state.criteria ?? values });
      draft.entryId = entryId; setOperation(draft); setValues(draft.command.criteria); setContext({ ...context, revision: state.revision });
      setMessage("New revision. Save or queue it when ready.");
    } catch (reason) { if (generation === scopeGeneration.current) setError(reason instanceof Error ? reason.message : "Could not refresh the score."); }
    finally { if (generation === scopeGeneration.current) setBusy(false); }
  }

  return <div className="judge-shell judge-connected"><header className="judge-header"><Brand /><div className="judge-event"><strong>Assigned scorecard</strong><span>{eventId}</span></div><Link className="text-link" href={`/console/${segment(eventId)}/sync`}>Saved scores</Link></header>
    <main id="main-content" className="judge-main"><div className="judge-performance"><div className="judge-crew"><h1>Score performance</h1><p>Entry: {entryId}</p></div><p className="sync-state" aria-live="polite">{online ? "Online" : "Offline"} · {current?.state || "draft"}</p></div>
      {loading && online ? <p role="status">Loading your account…</p> : !user ? <p><Link className="button button-volt" href="/sign-in">Sign in to open your assigned scorecard</Link></p> : <>
      <label className="trust-device"><input type="checkbox" checked={trusted} onChange={e => { trustedRef.current = e.target.checked; setTrusted(e.target.checked); }} />This is my trusted judging device. Save my drafts and commands here until I remove them.</label>
      <p className="info-note">Pilot scoring configuration: five criteria, up to 20 points each. Official rulebook approval is still required.</p>
      {(error || (online && accountError)) && <p className="form-error" role="alert">{error || accountError}</p>}
      <div className="judge-workspace"><section className="criteria-panel" aria-label="Score criteria">{criteria.map(([key, label]) => <div key={key} className="criterion"><div className="criterion-title"><label htmlFor={`numeric-${key}`}>{label}</label><div className="criterion-numeric"><input id={`numeric-${key}`} disabled={!canEdit} type="number" min={0} max={20} step={0.25} value={belongsToCurrentUser ? values[key] : 0} onChange={e => { setValues({ ...values, [key]: Math.min(20, Math.max(0, Number(e.target.value) || 0)) }); setDirty(true); setMessage("Unsaved changes on screen."); }} /><span>/ 20</span></div></div><div className="criterion-track"><input aria-label={`${label} slider`} disabled={!canEdit} type="range" min={0} max={20} step={0.25} value={belongsToCurrentUser ? values[key] : 0} onChange={e => { setValues({ ...values, [key]: Number(e.target.value) }); setDirty(true); setMessage("Unsaved changes on screen."); }} /></div></div>)}</section>
      <aside className="judge-score-summary"><span>{current?.receipt ? "Your accepted total" : "Your draft total"}</span><div className="judge-total mono">{belongsToCurrentUser ? Object.values(values).reduce((a, b) => a + b, 0).toFixed(2) : "0.00"}<span>/ 100</span></div><p className="sync-state" aria-live="polite">{current?.state === "acknowledged" ? "Accepted by server." : current?.state === "conflict" || current?.state === "rejected" ? "This score needs review. Keep the saved command on this device." : message}</p>
      {current?.receipt && <p className="sync-state">Accepted by server · Receipt {current.receipt.receipt_id} · Revision {current.receipt.score_revision}</p>}
      {current?.message && !current.receipt && <p role="status">{current.message}</p>}
      <button className="button button-outline" disabled={!canEdit} onClick={() => save(false)}>Save device draft</button>
      <button className="button button-volt" disabled={!canEdit} onClick={() => setReview(true)}>Review score</button>
      {current?.state === "acknowledged" && <button className="button button-outline" disabled={busy || !online} onClick={startRevision}>Start a correction</button>}
      <button className="button button-outline" disabled={!trusted || busy || !online} onClick={sync}>Sync saved scores</button>
      <p className="fineprint">Queued scores keep their original revision. Conflicts stay on this device for head judge review.</p></aside></div></>}
    </main>
    {review && belongsToCurrentUser && <dialog ref={reviewDialog} onCancel={() => setReview(false)} className="review-dialog" aria-labelledby="connected-review-title"><h2 id="connected-review-title">Review your score</h2><dl className="review-list">{criteria.map(([key, label]) => <div key={key}><dt>{label}</dt><dd className="mono">{values[key].toFixed(2)}</dd></div>)}</dl><p>This queues your score. Submission is confirmed only when a matching server receipt arrives.</p><div className="connected-actions"><button className="button button-outline" onClick={() => setReview(false)}>Keep editing</button><button className="button button-volt" disabled={busy} onClick={() => save(true)}>Queue score</button></div></dialog>}
  </div>;
}
