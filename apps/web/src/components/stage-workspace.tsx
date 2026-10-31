"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Brand, PageHeading } from "@/components/ui";
import { useWorkspaceSession } from "@/lib/account";
import { ApiError, connectedRequest, segment } from "@/lib/connected-api";
import { registrationCommand } from "@/lib/registration-command";
import { LineupHistory } from "@/components/lineup-history";
import { StageLineup } from "@/components/stage-lineup";
import { StageConfiguration } from "@/components/stage-configuration";
import { StageCreate } from "@/components/stage-create";
import { StageAssignments } from "@/components/stage-assignments";
import { StageTimeline } from "@/components/stage-timeline";

type Position = "holding" | "on_deck" | "performing" | "completed";
type Stage = { stage_id: string; active: boolean; single_performer: boolean; performing_entry: string | null; held: boolean; hold_revision: number };
type Entry = { stage_id: string; entry_id: string; position: Position; revision: number };
type Page<T> = { items: T[]; next_page: string | null };
const next: Partial<Record<Position, Position>> = { holding: "on_deck", on_deck: "performing", performing: "completed" };
const labels: Record<Position, string> = { holding: "Holding", on_deck: "On deck", performing: "Performing", completed: "Completed" };

function Desk({ chapter, eventId, uid, director }: { chapter: string; eventId: string; uid: string; director: boolean }) {
  const base = `/v1/chapters/${segment(chapter)}/events/${segment(eventId)}`;
  const [stages, setStages] = useState<Stage[]>([]);
  const [stage, setStage] = useState("");
  const stageRef = useRef("");
  const stageRequest = useRef(0);
  const statusRequest = useRef(0);
  const holdInFlight = useRef(false);
  const entryRequest = useRef(0);
  const [stageCursor, setStageCursor] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [entryCursor, setEntryCursor] = useState<string | null>(null);
  const [entryId, setEntryId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [stageLoadFailed, setStageLoadFailed] = useState(false);
  const [entryLoadFailed, setEntryLoadFailed] = useState(false);
  const [stageStatus, setStageStatus] = useState<Stage | null>(null);
  const [statusError, setStatusError] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadStages(cursor?: string) {
    const request = ++stageRequest.current;
    setLoading(true); setError(""); setStageLoadFailed(false);
    try {
      const query = new URLSearchParams({ limit: "50", ...(cursor ? { cursor } : {}) });
      const page = await connectedRequest<Page<Stage>>(`${base}/stages?${query}`, undefined, "GET", uid);
      if (request !== stageRequest.current) return;
      setStages(current => cursor ? [...current, ...page.items] : page.items);
      setStageCursor(page.next_page);
      if (!cursor) setStage(current => { const value = page.items.some(item => item.stage_id === current) ? current : page.items[0]?.stage_id || ""; stageRef.current = value; return value; });
      else if (!stageRef.current && page.items[0]) { stageRef.current = page.items[0].stage_id; setStage(page.items[0].stage_id); }
    } catch (reason) { if (request === stageRequest.current) { setStageLoadFailed(true); setError(reason instanceof Error ? reason.message : "Unable to load stages."); } }
    finally { if (request === stageRequest.current) setLoading(false); }
  }
  async function loadEntries(selected: string, cursor?: string) {
    if (!selected) return;
    const request = ++entryRequest.current;
    setLoadingEntries(true); setError(""); setEntryLoadFailed(false);
    try {
      const query = new URLSearchParams({ limit: "50", ...(cursor ? { cursor } : {}) });
      const page = await connectedRequest<Page<Entry>>(`${base}/stages/${segment(selected)}/entries?${query}`, undefined, "GET", uid);
      if (stageRef.current !== selected || request !== entryRequest.current) return;
      setEntries(current => cursor ? [...current, ...page.items] : page.items);
      setEntryCursor(page.next_page);
    } catch (reason) { if (stageRef.current === selected && request === entryRequest.current) { setEntryLoadFailed(true); if (reason instanceof ApiError && [401,403].includes(reason.status)) { setEntries([]); setEntryCursor(null); } setError(reason instanceof Error ? reason.message : "Unable to load stage entries."); } }
    finally { if (stageRef.current === selected && request === entryRequest.current) setLoadingEntries(false); }
  }
  async function loadStageStatus(selected: string) {
    if (holdInFlight.current) return;
    const request = ++statusRequest.current;
    try {
      const value = await connectedRequest<Stage>(`${base}/stages/${segment(selected)}`, undefined, "GET", uid);
      if (stageRef.current === selected && request === statusRequest.current) { setStageStatus(value); setStatusError(""); }
    } catch (reason) {
      if (stageRef.current === selected && request === statusRequest.current) { setStageStatus(null); setStatusError(reason instanceof Error ? reason.message : "Unable to load stage status."); }
    }
  }
  useEffect(() => { void loadStages(); }, [chapter, eventId, uid]);
  useEffect(() => { setEntries([]); setEntryCursor(null); setStageStatus(null); setStatusError(""); if (stage) { void loadEntries(stage); void loadStageStatus(stage); const timer = window.setInterval(() => void loadStageStatus(stage), 5000); return () => { window.clearInterval(timer); statusRequest.current++; }; } else { entryRequest.current++; setLoadingEntries(false); } }, [stage]);

  async function move(id: string, revision: number, position: Position) {
    if (!stage) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await registrationCommand<Entry>(`${base}/stage-commands`, { stage_id: stage, entry_id: id, expected_revision: revision, position }, "POST", false, uid);
      setNotice(`Saved ${result.entry_id}: ${labels[result.position]} (revision ${result.revision}).`);
      await loadEntries(stage);
    } catch (reason) {
      setError(reason instanceof ApiError && reason.status === 409 ? "The stage or entry changed, or the entry is not ready. Refresh the queue and review its current state before retrying." : reason instanceof Error ? reason.message : "Unable to save the stage position.");
    } finally { setBusy(false); }
  }
  function add(event: FormEvent) { event.preventDefault(); void move(entryId.trim(), 0, "holding"); }
  async function changeHold() {
    if (!stage || !stageStatus || stageStatus.stage_id !== stage) return;
    setBusy(true); setError(""); setNotice(""); statusRequest.current++; holdInFlight.current = true;
    try {
      const result = await registrationCommand<Stage>(`${base}/stage-holds`, { stage_id: stage, expected_revision: stageStatus.hold_revision, held: !stageStatus.held }, "POST", false, uid);
      if (stageRef.current === stage) { setStageStatus(result); setStatusError(""); setNotice(result.held ? "Stage hold saved." : "Stage hold released."); }
    } catch (reason) {
      setError(reason instanceof ApiError && reason.status === 409 ? "The stage hold changed. Refresh its status before retrying." : reason instanceof Error ? reason.message : "Unable to update the stage hold.");
    } finally { holdInFlight.current = false; setBusy(false); }
  }
  const selected = stages.find(value => value.stage_id === stage);
  const currentStatus = stageStatus?.stage_id === stage ? stageStatus : null;
  return <div className="connected-stack">
    {director && <StageCreate base={base} uid={uid} onCreated={() => void loadStages()}/>}
    <section className="panel"><h2>Stage</h2>{loading ? <p role="status">Loading stages…</p> : stages.length === 0 ? <p>{stageLoadFailed ? "Stage list is unavailable." : stageCursor ? "No active stages on this page. Load more to continue." : "No active stages are configured for this event."}</p> : <><label htmlFor="stage-select">Select stage</label><select id="stage-select" value={stage} disabled={busy} onChange={event => { stageRef.current = event.target.value; setStage(event.target.value); }}>{stages.map(value => <option key={value.stage_id} value={value.stage_id}>{value.stage_id}{value.active ? "" : " (inactive)"}</option>)}</select>{selected && <p>{selected.single_performer ? "One performer at a time" : "Multiple performers allowed"}</p>}</>}{stageCursor && <button className="button button-outline" type="button" disabled={busy || loading} onClick={() => void loadStages(stageCursor)}>Load more stages</button>}</section>
    {stageLoadFailed && <button type="button" className="button button-outline" disabled={busy || loading} onClick={() => { setLoading(true); void loadStages(stageCursor || undefined); }}>Retry loading stages</button>}
    {stage && <section className="panel"><h2>Stage hold</h2>{currentStatus ? <p role="status"><strong>{currentStatus.held ? "Hold active" : "No hold active"}</strong> · revision {currentStatus.hold_revision}</p> : <p role="status">{statusError ? "Stage hold status is unavailable." : "Loading hold status…"}</p>}<div className="connected-actions"><button type="button" className="button button-outline" disabled={busy || !currentStatus?.active} style={{minHeight:56}} onClick={() => void changeHold()}>{currentStatus?.held ? "Release stage hold" : "Put stage on hold"}</button><button type="button" className="button button-outline" disabled={busy} style={{minHeight:56}} onClick={() => void loadStageStatus(stage)}>Refresh hold status</button></div><p className="fineprint">A hold blocks starting another performance in this system. It does not notify other operators; use your event communication procedure. Status refreshes while this page is open.</p>{statusError && <p role="alert" className="form-error">{statusError}</p>}</section>}
    {stage && <><section className="panel"><h2>Add to holding</h2><p>Use an approved entry ID. The server checks readiness and event check-ins.</p><form onSubmit={add}><label htmlFor="stage-entry">Entry ID</label><input id="stage-entry" maxLength={200} required value={entryId} onChange={event => setEntryId(event.target.value)} disabled={busy}/><button className="button button-volt" disabled={busy} style={{minHeight:56}}>Add to holding</button></form></section>
    <section className="panel"><div className="connected-actions"><h2>Stage entries</h2><button className="button button-outline" type="button" disabled={busy || loadingEntries} onClick={() => void loadEntries(stage)}>Refresh</button></div>{loadingEntries ? <p role="status">Loading entries…</p> : entries.length === 0 ? <p>{entryLoadFailed ? "Stage entries are unavailable." : "No entries on this page."}</p> : <ul className="connected-list">{entries.map(value => <li key={value.entry_id}><strong>{value.entry_id}</strong><p>{labels[value.position]} · revision {value.revision}</p>{next[value.position] && <button type="button" className="button button-outline" style={{minHeight:56}} disabled={busy || (next[value.position] === "performing" && (!currentStatus || currentStatus.held))} onClick={() => void move(value.entry_id, value.revision, next[value.position]!)}>Move to {labels[next[value.position]!]}</button>}</li>)}</ul>}{entryCursor && <button type="button" className="button button-outline" disabled={busy || loadingEntries} onClick={() => void loadEntries(stage, entryCursor)}>Load more entries</button>}</section></>}
    {error && <p role="alert" className="form-error">{error}</p>}{notice && <p role="status">{notice}</p>}
    {stage && director && <StageConfiguration key={`configuration/${stage}/${uid}`} base={base} stage={stage} uid={uid} onSaved={value => { setStages(current => current.map(item => item.stage_id === stage ? { ...item, ...value } : item)); void loadStageStatus(stage); }}/>}
    {stage && director && <StageAssignments key={`access/${stage}/${uid}`} base={base} stage={stage} uid={uid}/>}
    {stage && <StageLineup key={`lineup/${stage}/${uid}`} base={base} stage={stage} uid={uid} director={director}/>}
    {stage && <LineupHistory key={`lineup-history/${stage}/${uid}`} base={base} stage={stage} uid={uid}/>}
    {stage && <StageTimeline key={`${stage}/${uid}`} base={base} stage={stage} uid={uid}/>}
    <p className="fineprint">Entries are listed by record, not performance order. Calls and operator notifications are not connected. Stage changes require a connection.</p>
    <Link className="text-link" href={`/console/${segment(eventId)}/check-in`}>Open check-in desk</Link>
  </div>;
}
export function StageWorkspace({ eventId }: { eventId: string }) {
  const { session, loading, error } = useWorkspaceSession();
  return <div className="judge-shell"><header className="judge-header"><Brand/><div className="judge-event"><strong>Backstage marshal</strong><span>Event {eventId}</span></div><Link href="/console" className="text-link">Console hub</Link></header><main id="main-content" className="workspace-main"><PageHeading title="Backstage queue" description="Track entries through the configured stage positions."/>{loading ? <p role="status">Checking access…</p> : !session ? <p role="alert">{error || "Sign in to continue."} <Link href={`/sign-in?next=${segment(`/console/${segment(eventId)}/marshal`)}`}>Sign in</Link></p> : !["marshal", "chapter_director"].includes(session.role) ? <p role="alert">Your account does not have stage access.</p> : <Desk key={`${session.chapter_id}/${session.uid}/${eventId}`} chapter={session.chapter_id} eventId={eventId} uid={session.uid} director={session.role === "chapter_director"}/>}</main></div>;
}
