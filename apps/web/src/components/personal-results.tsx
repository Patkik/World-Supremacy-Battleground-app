"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useWorkspaceSession } from "@/lib/account";
import { connectedPage, connectedRequest, segment } from "@/lib/connected-api";
import type { Entry } from "@/lib/api";
import { PageHeading } from "./ui";

type Published = { publication_id: string; division_id: string; published_at: number; result: { entry_id: string; crew_id: string; raw_average: number; total_deductions: number; final_score: number; rank: number } };
function EntryResult({ entry, chapterId, eventId, uid }: { entry: Entry; chapterId: string; eventId: string; uid: string }) {
  const [value, setValue] = useState<Published | null>(null); const [loaded, setLoaded] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const generation = useRef(0);
  useEffect(() => () => { generation.current++; }, []);
  async function load() {
    const current = ++generation.current; setBusy(true); setLoaded(false); setValue(null); setError("");
    try {
      const data = await connectedRequest<Published | null>(`/v1/chapters/${segment(chapterId)}/events/${segment(eventId)}/entries/${segment(entry.id)}/published-result`, undefined, "GET", uid);
      if (data && (data.result.entry_id !== entry.id || data.result.crew_id !== entry.crew_id || !Number.isSafeInteger(data.result.rank) || data.result.rank < 1 || ![data.result.raw_average, data.result.total_deductions, data.result.final_score].every(Number.isFinite))) throw new Error("The published result could not be verified.");
      if (generation.current === current) { setValue(data); setLoaded(true); }
    } catch (reason) { if (generation.current === current) setError(reason instanceof Error ? reason.message : "The published result could not be loaded."); }
    finally { if (generation.current === current) setBusy(false); }
  }
  return <article className="panel"><h3>{entry.crew_id}</h3><p>{entry.division_id}</p><button type="button" className="button button-outline" disabled={busy} onClick={() => void load()}>{busy ? "Checking…" : loaded ? "Refresh published result" : "Check published result"}</button>{error && <p role="alert" className="form-error">{error}</p>}{loaded && !value && <p role="status">No published result is available for this entry.</p>}{value && <div role="status"><p>Published rank <strong className="mono">{value.result.rank}</strong></p><dl className="review-list"><div><dt>Average</dt><dd className="mono">{value.result.raw_average.toFixed(2)}</dd></div><div><dt>Deductions</dt><dd className="mono">{value.result.total_deductions.toFixed(2)}</dd></div><div><dt>Final score</dt><dd className="mono">{value.result.final_score.toFixed(2)}</dd></div></dl><p className="fineprint">Publication {value.publication_id}. Individual judge scores and notes are not included.</p></div>}</article>;
}

function EventResults({ uid, chapterId, eventId, role }: { uid: string; chapterId: string; eventId: string; role: string }) {
  const [entries, setEntries] = useState<Entry[]>([]); const [cursor, setCursor] = useState<string | null>(null); const [busy, setBusy] = useState(false); const [loaded, setLoaded] = useState(false); const [error, setError] = useState(""); const generation = useRef(0);
  const load = useCallback(async (next?: string | null) => {
    const current = ++generation.current; setBusy(true); setError("");
    try { const page = await connectedPage<Entry>(`/v1/chapters/${segment(chapterId)}/events/${segment(eventId)}/entries`, next, uid); if (!Array.isArray(page.items) || page.items.some(entry => entry.chapter_id !== chapterId || entry.event_id !== eventId || typeof entry.id !== "string" || !Array.isArray(entry.roster)) || (page.next_page !== null && typeof page.next_page !== "string")) throw new Error("Entry results could not be verified for this chapter and event."); if (generation.current === current) { const visible = role === "dancer" ? page.items.filter(entry => entry.roster.some(member => member.uid === uid)) : page.items; setEntries(previous => next ? [...previous, ...visible] : visible); setCursor(page.next_page); setLoaded(true); } }
    catch (reason) { if (generation.current === current) { setEntries([]); setCursor(null); setLoaded(true); setError(reason instanceof Error ? reason.message : "Entries could not be loaded."); } }
    finally { if (generation.current === current) setBusy(false); }
  }, [chapterId, eventId, role, uid]);
  useEffect(() => { void load(); return () => { generation.current++; }; }, [load]);
  return <section className="connected-stack"><h2>Entries for {eventId}</h2>{busy && <p role="status">Loading entries…</p>}{error && <p role="alert" className="form-error">{error}</p>}{loaded && !error && entries.length === 0 && <p>No eligible entries were found on the pages loaded.</p>}{entries.map(entry => <EntryResult key={entry.id} entry={entry} chapterId={chapterId} eventId={eventId} uid={uid} />)}{cursor && <button type="button" className="button button-outline" disabled={busy} onClick={() => void load(cursor)}>Load more entries</button>}<button type="button" className="button button-outline" disabled={busy} onClick={() => void load()}>Refresh entries</button></section>;
}

export function PersonalResults() {
  const { session, loading, error } = useWorkspaceSession(); const [input, setInput] = useState(""); const [eventId, setEventId] = useState(""); const [inputError, setInputError] = useState("");
  const activeChapter = session?.chapter_id;
  useEffect(() => {
    if (!activeChapter) return;
    const query = new URLSearchParams(window.location.search);
    const chapter = query.get("chapter"); const reference = query.get("event");
    if (!chapter && !reference) return;
    if (!chapter || chapter !== activeChapter) { setEventId(""); setInputError("Switch to the chapter associated with this result, then open the notification again."); return; }
    const value = reference?.trim() || "";
    if (!value || value.length > 200 || value.includes("/") || value === "." || value === "..") { setEventId(""); setInputError("The event reference in this link is invalid."); return; }
    setInput(value); setInputError(""); setEventId(value);
  }, [activeChapter]);
  function open(event: FormEvent) { event.preventDefault(); const value = input.trim(); if (!value || value.length > 200 || value.includes("/") || value === "." || value === "..") { setInputError("Enter a valid event reference."); return; } setInputError(""); setEventId(value); }
  return <main id="main-content" className="workspace-main"><PageHeading title="Your published results" description="View aggregate standings released by event staff." /><div className="connected-stack">{loading ? <p role="status">Checking chapter access…</p> : !session ? <><p>{error || "Sign in to continue."}</p><Link className="button button-outline" href={`/sign-in?next=${segment("/app/scorecards")}`}>Sign in</Link></> : !["crew_manager", "dancer"].includes(session.role) ? <p>Sign in as a participant or crew manager to view your entries.</p> : <><form className="panel" onSubmit={open}><label htmlFor="personal-results-event">Event reference</label><input id="personal-results-event" value={input} onChange={event => setInput(event.target.value)} required />{inputError && <p role="alert" className="form-error">{inputError}</p>}<button className="button button-volt" type="submit">Find entries</button><p className="fineprint">Use the reference supplied by your event organizer. Detailed judge scorecards and notes are not yet available here.</p></form>{eventId && <EventResults key={`${session.uid}:${session.chapter_id}:${eventId}`} uid={session.uid} chapterId={session.chapter_id} eventId={eventId} role={session.role} />}</>}</div></main>;
}
