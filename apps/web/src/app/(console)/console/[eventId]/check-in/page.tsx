"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Brand, PageHeading } from "@/components/ui";
import { useWorkspaceSession } from "@/lib/account";
import { ApiError, connectedPage, connectedRequest, segment, type ApiPage } from "@/lib/connected-api";

type Receipt = { pass_id: string; event_id: string; dancer_uid: string; checked_in_at: number };
type CheckInPage = { items: Receipt[]; next_page: string | null };
type CheckInDancer = { uid: string; name: string };
type Candidate = { entry_id: string; crew_id: string; division_id: string; dancers: CheckInDancer[] };

function validCandidatePage(value: unknown): value is ApiPage<Candidate> {
  if (!value || typeof value !== "object") return false;
  const page = value as Partial<ApiPage<Candidate>>;
  if (!Array.isArray(page.items) || page.items.length > 100) return false;
  if (!(page.next_page === null || (typeof page.next_page === "string" && page.next_page.length > 0 && page.next_page.length <= 4096))) return false;
  return page.items.every(candidate => {
    if (!candidate || typeof candidate !== "object" ||
      typeof candidate.entry_id !== "string" || !candidate.entry_id || candidate.entry_id.length > 200 ||
      typeof candidate.crew_id !== "string" || !candidate.crew_id || candidate.crew_id.length > 200 ||
      typeof candidate.division_id !== "string" || !candidate.division_id || candidate.division_id.length > 200 ||
      !Array.isArray(candidate.dancers) || candidate.dancers.length > 500) return false;
    const uids = new Set<string>();
    return candidate.dancers.every(dancer => {
      if (!dancer || typeof dancer !== "object" || typeof dancer.uid !== "string" || !dancer.uid || dancer.uid.length > 200 ||
        typeof dancer.name !== "string" || !dancer.name || dancer.name.length > 200 || uids.has(dancer.uid)) return false;
      uids.add(dancer.uid);
      return true;
    });
  });
}

function Desk({ eventId, chapter, uid }: { eventId: string; chapter: string; uid: string }) {
  const [entry, setEntry] = useState("");
  const [dancer, setDancer] = useState("");
  const [selectedCandidateEntry, setSelectedCandidateEntry] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candidateCursor, setCandidateCursor] = useState<string | null>(null);
  const [candidateError, setCandidateError] = useState("");
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [records, setRecords] = useState<Receipt[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [listError, setListError] = useState("");
  const [loadingRecords, setLoadingRecords] = useState(true);

  const selectedCandidate = useMemo(
    () => candidates.find(candidate => candidate.entry_id === selectedCandidateEntry),
    [candidates, selectedCandidateEntry],
  );

  async function loadRecords(cursor?: string, append = false) {
    setListError("");
    try {
      const query = new URLSearchParams({ limit: "20", ...(cursor ? { cursor } : {}) });
      const result = await connectedRequest<CheckInPage>(`/v1/chapters/${segment(chapter)}/events/${segment(eventId)}/check-ins?${query}`, undefined, "GET", uid);
      setRecords(current => append ? [...current, ...result.items] : result.items);
      setNextCursor(result.next_page);
    } catch (reason) {
      setListError(reason instanceof Error ? reason.message : "Unable to load event check-ins.");
    } finally {
      setLoadingRecords(false);
    }
  }

  const loadCandidates = useCallback(async (next?: string | null) => {
    setLoadingCandidates(true);
    setCandidateError("");
    try {
      const path = `/v1/chapters/${segment(chapter)}/events/${segment(eventId)}/check-in/candidates`;
      const page = await connectedPage<Candidate>(path, next, uid);
      if (!validCandidatePage(page)) throw new Error("The roster lookup response could not be verified.");
      setCandidates(current => {
        const merged = next ? [...current, ...page.items] : page.items;
        return [...new Map(merged.map(candidate => [candidate.entry_id, candidate])).values()];
      });
      setCandidateCursor(page.next_page);
    } catch (reason) {
      setCandidateError(reason instanceof Error ? reason.message : "Unable to load eligible roster choices.");
    } finally {
      setLoadingCandidates(false);
    }
  }, [chapter, eventId, uid]);

  useEffect(() => {
    void loadRecords();
    void loadCandidates();
  }, [chapter, eventId, uid, loadCandidates]);

  async function checkIn(event: FormEvent) {
    event.preventDefault();
    setError("");
    setReceipt(null);
    setBusy(true);
    try {
      const value = await connectedRequest<Receipt>(`/v1/chapters/${segment(chapter)}/events/${segment(eventId)}/check-in`, { entry_id: entry.trim(), dancer_uid: dancer.trim() }, "POST", uid);
      setReceipt(value);
      await loadRecords();
    } catch (reason) {
      setError(reason instanceof ApiError && reason.status === 409
        ? "The entry or dancer is no longer eligible. Refresh the roster choices and try again."
        : reason instanceof Error ? reason.message : "Unable to record check-in.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="connected-stack">
    <section className="panel">
      <h2>Online check-in</h2>
      <p>Choose a roster member or enter the IDs manually. The server rechecks current eligibility before saving arrival.</p>
      <p>Roster lookup includes only approved, currently ready entries. It can be out of date; the saved check-in is authoritative. Confirm the participant’s identity separately. QR passes and offline scanning are not available yet.</p>

      <div className="connected-stack">
        <h3>Roster lookup</h3>
        {loadingCandidates && candidates.length === 0 && <p role="status">Loading eligible entries…</p>}
        {candidateError && <p className="form-error" role="alert">{candidateError}</p>}
        {candidates.length > 0 && <>
          <label htmlFor="checkin-candidate-entry">Approved entry</label>
          <select id="checkin-candidate-entry" value={selectedCandidateEntry} onChange={event => {
            const candidate = candidates.find(item => item.entry_id === event.target.value);
            setSelectedCandidateEntry(candidate?.entry_id ?? "");
            setEntry(candidate?.entry_id ?? "");
            setDancer("");
          }} style={{ minHeight: 56 }}>
            <option value="">Select an entry</option>
            {candidates.map(candidate => <option key={candidate.entry_id} value={candidate.entry_id}>
              {candidate.crew_id} · {candidate.division_id} · {candidate.entry_id}
            </option>)}
          </select>
          {selectedCandidate && <>
            <label htmlFor="checkin-candidate-dancer">Roster member</label>
            <select id="checkin-candidate-dancer" value={dancer} onChange={event => setDancer(event.target.value)} style={{ minHeight: 56 }}>
              <option value="">Select a dancer</option>
              {selectedCandidate.dancers.map(member => <option key={member.uid} value={member.uid}>{member.name} · {member.uid}</option>)}
            </select>
          </>}
        </>}
        {candidateCursor && <button type="button" className="button button-outline" style={{ minHeight: 56 }} disabled={loadingCandidates} onClick={() => void loadCandidates(candidateCursor)}>
          {loadingCandidates ? "Loading entries…" : "Load more eligible entries"}
        </button>}
        {!loadingCandidates && !candidateError && candidates.length === 0 && <p>No approved, ready entries are available in this page. You can still use the manual fields below.</p>}
      </div>

      <form onSubmit={checkIn} className="connected-stack">
        <h3>Manual entry</h3>
        <label htmlFor="checkin-entry">Entry ID</label>
        <input id="checkin-entry" required maxLength={200} value={entry} onChange={event => {
          setEntry(event.target.value);
          setSelectedCandidateEntry("");
        }} style={{ minHeight: 56 }} />
        <label htmlFor="checkin-dancer">Dancer account ID</label>
        <input id="checkin-dancer" required maxLength={200} value={dancer} onChange={event => setDancer(event.target.value)} style={{ minHeight: 56 }} />
        <button className="button button-volt" style={{ minHeight: 56 }} disabled={busy}>{busy ? "Recording…" : "Record check-in"}</button>
      </form>
      {error && <p className="form-error" role="alert">{error}</p>}
      {receipt && <p role="status">Check-in recorded. Reference: <span className="mono">{receipt.pass_id}</span>. Repeating this check-in returns the same record.</p>}
    </section>

    <section className="panel">
      <div className="connected-actions">
        <h2>Event arrivals</h2>
        <button type="button" className="button button-outline" style={{ minHeight: 56 }} disabled={loadingRecords} onClick={() => { setLoadingRecords(true); void loadRecords(); }}>Refresh</button>
      </div>
      {loadingRecords ? <p role="status">Loading event check-ins…</p> : listError ? <p className="form-error" role="alert">{listError}</p> : records.length === 0 ? <p className="fineprint">No arrivals recorded for this event yet.</p> : <ol className="connected-list">{records.map(value => <li key={value.pass_id}><strong>{value.dancer_uid}</strong><span>Reference <span className="mono">{value.pass_id}</span> · {new Date(value.checked_in_at * 1000).toLocaleString()}</span></li>)}</ol>}
      {!loadingRecords && !listError && nextCursor && <button type="button" className="button button-outline" style={{ minHeight: 56 }} onClick={() => { setLoadingRecords(true); void loadRecords(nextCursor, true); }}>Load more arrivals</button>}
      <p className="fineprint">This list is paginated and operational, not proof of identity.</p>
    </section>
  </div>;
}

export default function Page({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);
  const { session, loading, error } = useWorkspaceSession();
  return <div className="judge-shell">
    <header className="judge-header"><Brand /><div className="judge-event"><strong>Check-in desk</strong><span>Event {eventId}</span></div><Link href="/console" className="text-link">Console hub</Link></header>
    <main id="main-content" className="workspace-main">
      <PageHeading title="Dancer check-in" description="Record a participant’s arrival for this event." />
      {loading ? <p role="status">Checking access…</p> : !session ? <p role="alert">{error || "Sign in to continue."} <Link href={`/sign-in?next=${segment(`/console/${segment(eventId)}/check-in`)}`}>Sign in</Link></p> : !["marshal", "chapter_director"].includes(session.role) ? <p role="alert">Your account does not have check-in access.</p> : <Desk key={`${session.chapter_id}/${session.uid}/${eventId}`} chapter={session.chapter_id} uid={session.uid} eventId={eventId} />}
    </main>
  </div>;
}
