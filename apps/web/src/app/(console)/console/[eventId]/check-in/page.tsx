"use client";
import Link from "next/link";
import { use, useEffect, useState, type FormEvent } from "react";
import { Brand, PageHeading } from "@/components/ui";
import { useWorkspaceSession } from "@/lib/account";
import { ApiError, connectedRequest, segment } from "@/lib/connected-api";

type Receipt = { pass_id: string; event_id: string; dancer_uid: string; checked_in_at: number };
type CheckInPage = { items: Receipt[]; next_page: string | null };
function Desk({ eventId, chapter, uid }: { eventId: string; chapter: string; uid: string }) {
  const [entry, setEntry] = useState("");
  const [dancer, setDancer] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [records, setRecords] = useState<Receipt[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [listError, setListError] = useState("");
  const [loadingRecords, setLoadingRecords] = useState(true);
  async function loadRecords(cursor?: string, append = false) {
    setListError("");
    try {
      const query = new URLSearchParams({ limit: "20", ...(cursor ? { cursor } : {}) });
      const result = await connectedRequest<CheckInPage>(`/v1/chapters/${segment(chapter)}/events/${segment(eventId)}/check-ins?${query}`, undefined, "GET", uid);
      setRecords(current => append ? [...current, ...result.items] : result.items);
      setNextCursor(result.next_page);
    } catch (reason) {
      setListError(reason instanceof Error ? reason.message : "Unable to load event check-ins.");
    } finally { setLoadingRecords(false); }
  }
  useEffect(() => { void loadRecords(); }, [chapter, eventId, uid]);
  async function checkIn(event: FormEvent) {
    event.preventDefault(); setError(""); setReceipt(null); setBusy(true);
    try {
      const value = await connectedRequest<Receipt>(`/v1/chapters/${segment(chapter)}/events/${segment(eventId)}/check-in`, { entry_id: entry.trim(), dancer_uid: dancer.trim() }, "POST", uid);
      setReceipt(value);
      await loadRecords();
    } catch (reason) {
      setError(reason instanceof ApiError && reason.status === 409 ? "Check the entry and dancer IDs. The dancer must be on an approved, ready entry." : reason instanceof Error ? reason.message : "Unable to record check-in.");
    } finally { setBusy(false); }
  }
  return <div className="connected-stack"><section className="panel"><h2>Online check-in</h2><p>Enter the approved entry ID and dancer account ID. The server checks eligibility before recording arrival.</p><p>Confirm the participant’s identity separately. QR passes and offline scanning are not available yet.</p><form onSubmit={checkIn} className="connected-stack"><label htmlFor="checkin-entry">Entry ID</label><input id="checkin-entry" required maxLength={200} value={entry} onChange={e => setEntry(e.target.value)} style={{minHeight:56}}/><label htmlFor="checkin-dancer">Dancer account ID</label><input id="checkin-dancer" required maxLength={200} value={dancer} onChange={e => setDancer(e.target.value)} style={{minHeight:56}}/><button className="button button-volt" style={{minHeight:56}} disabled={busy}>{busy ? "Recording…" : "Record check-in"}</button></form>{error && <p className="form-error" role="alert">{error}</p>}{receipt && <p role="status">Check-in recorded. Reference: <span className="mono">{receipt.pass_id}</span>. Repeating this check-in returns the same record.</p>}</section><section className="panel"><div className="connected-actions"><h2>Event arrivals</h2><button type="button" className="button button-outline" onClick={() => { setLoadingRecords(true); void loadRecords(); }}>Refresh</button></div>{loadingRecords ? <p role="status">Loading event check-ins…</p> : listError ? <p className="form-error" role="alert">{listError}</p> : records.length === 0 ? <p className="fineprint">No arrivals recorded for this event yet.</p> : <ol className="connected-list">{records.map(value => <li key={value.pass_id}><strong>{value.dancer_uid}</strong><span>Reference <span className="mono">{value.pass_id}</span> · {new Date(value.checked_in_at * 1000).toLocaleString()}</span></li>)}</ol>}{!loadingRecords && !listError && nextCursor && <button type="button" className="button button-outline" onClick={() => { setLoadingRecords(true); void loadRecords(nextCursor, true); }}>Load more arrivals</button>}<p className="fineprint">This list is paginated and operational, not proof of identity.</p></section></div>;
}
export default function Page({params}:{params:Promise<{eventId:string}>}) {
  const {eventId}=use(params); const {session,loading,error}=useWorkspaceSession();
  return <div className="judge-shell"><header className="judge-header"><Brand/><div className="judge-event"><strong>Check-in desk</strong><span>Event {eventId}</span></div><Link href="/console" className="text-link">Console hub</Link></header><main id="main-content" className="workspace-main"><PageHeading title="Dancer check-in" description="Record a participant’s arrival for this event."/>{loading ? <p role="status">Checking access…</p> : !session ? <p role="alert">{error || "Sign in to continue."} <Link href={`/sign-in?next=${segment(`/console/${segment(eventId)}/check-in`)}`}>Sign in</Link></p> : !["marshal","chapter_director"].includes(session.role) ? <p role="alert">Your account does not have check-in access.</p> : <Desk key={`${session.chapter_id}/${session.uid}/${eventId}`} chapter={session.chapter_id} uid={session.uid} eventId={eventId}/>}</main></div>;
}
