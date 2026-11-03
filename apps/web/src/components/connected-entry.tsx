"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useWorkspaceSession, type WorkspaceSession } from "@/lib/account";
import { connectedPage, connectedRequest, segment } from "@/lib/connected-api";
import type { Crew, Division, Entry, EntryDetailResponse } from "@/lib/api";
import { PageHeading } from "./ui";
import { registrationCommand } from "@/lib/registration-command";
import { AudioInspection } from "./audio-inspection";
import { MusicReview } from "./music-review";
import { MusicPolicyDraft } from "./music-policy-draft";
import { MusicAdvisory } from "./music-advisory";

export function ConnectedEntry({ eventId, entryId, chapterId, review = false }: { eventId: string | null; entryId?: string; chapterId?: string; review?: boolean }) {
  const { session, loading, error: sessionError } = useWorkspaceSession(chapterId);
  const title = entryId ? "Registration readiness" : "Register your crew";
  const returnTo = entryId && eventId ? chapterId && review ? `/admin/${segment(chapterId)}/events/${segment(eventId)}/registrations/${segment(entryId)}` : `/app/entries/${segment(entryId)}${review ? "/review" : ""}?event=${segment(eventId)}` : `/app/register/${segment(eventId || "")}`;
  if (!session) return <main id="main-content" className="workspace-main"><PageHeading title={title} description="Entry requirements and status are computed by the event service." /><div className="connected-stack">{loading ? <p role="status">Checking chapter access…</p> : <><p className="form-error">{sessionError || "Sign in to continue."}</p><Link href={`/sign-in?next=${segment(returnTo)}`}>Sign in</Link></>}</div></main>;
  return <ConnectedEntryWorkspace key={`${session.uid}:${session.chapter_id}:${eventId}:${entryId}:${review}`} session={session} eventId={eventId} entryId={entryId} chapterId={chapterId} review={review} />;
}

function ConnectedEntryWorkspace({ session, eventId, entryId, chapterId, review }: { session: WorkspaceSession; eventId: string | null; entryId?: string; chapterId?: string; review: boolean }) {
  const [crews, setCrews] = useState<Crew[]>([]); const [divisions, setDivisions] = useState<Division[]>([]);
  const [crewId, setCrewId] = useState(""); const [divisionId, setDivisionId] = useState("");
  const [crewCursor,setCrewCursor]=useState<string|null>(null);const [divisionCursor,setDivisionCursor]=useState<string|null>(null);
  const [detail, setDetail] = useState<EntryDetailResponse | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const generation = useRef(0);
  const router = useRouter();
  const allowed = !!session && (!chapterId || chapterId === session.chapter_id) && (!review || ["registrar", "chapter_director"].includes(session.role));
  const root = session && eventId ? `/v1/chapters/${segment(session.chapter_id)}/events/${segment(eventId)}` : "";
  const load = useCallback(async () => {
    if (!session || !eventId || !allowed) return;
    const current = ++generation.current;
    setBusy(true); setError("");
    try {
      if (entryId) {
        const value = await connectedRequest<EntryDetailResponse>(`${root}/entries/${segment(entryId)}`, undefined, "GET", session.uid);
        if (value.entry.id !== entryId || value.entry.chapter_id !== session.chapter_id || value.entry.event_id !== eventId) throw new Error("Entry response could not be verified for this chapter and event.");
        if (current === generation.current) setDetail(value);
      }
      else {
        const [crewData, divisionData] = await Promise.all([connectedPage<Crew>(`/v1/chapters/${segment(session.chapter_id)}/crews`, null, session.uid), connectedPage<Division>(`${root}/divisions`, null, session.uid)]);
        if (!Array.isArray(crewData.items) || crewData.items.some(crew => crew.chapter_id !== session.chapter_id) || !Array.isArray(divisionData.items)) throw new Error("Registration choices could not be verified for this chapter and event.");
        if (current === generation.current) { setCrews(crewData.items.filter(crew => crew.manager_uid === session.uid)); setDivisions(divisionData.items);setCrewCursor(crewData.next_page);setDivisionCursor(divisionData.next_page); }
      }
    } catch (reason) { if (current === generation.current) setError(reason instanceof Error ? reason.message : "Unable to open this entry."); }
    finally { if (current === generation.current) setBusy(false); }
  }, [session, eventId, entryId, root, allowed]);
  useEffect(() => { void load(); return () => { generation.current++; }; }, [load]);
  async function create(event: FormEvent) {
    event.preventDefault(); const current = ++generation.current; setBusy(true); setError("");
    try {
      const entry = await registrationCommand<Entry>(`${root}/entries`, { crew_id: crewId, division_id: divisionId }, "POST", false, session.uid);
      if (!entry.id || entry.chapter_id !== session.chapter_id || entry.event_id !== eventId || entry.crew_id !== crewId || entry.division_id !== divisionId) throw new Error("Created entry response could not be verified for this event.");
      if (current === generation.current) router.push(`/app/entries/${segment(entry.id)}?event=${segment(entry.event_id)}`);
    } catch (reason) { if (current === generation.current) setError(reason instanceof Error ? reason.message : "Unable to create entry."); }
    finally { if (current === generation.current) setBusy(false); }
  }
  async function act(status?: "approved" | "needs_correction") {
    if (!entryId || !detail) return;
    const current = ++generation.current; setBusy(true); setError("");
    try {
      const entry = await registrationCommand<Entry>(`${root}/entries/${segment(entryId)}/${status ? "review" : "submit"}`, {expected_revision:detail.entry.revision??0,...(status?{status}:{})}, "POST", false, session.uid);
      if (entry.id !== entryId || entry.chapter_id !== session.chapter_id || entry.event_id !== eventId) throw new Error("Updated entry response could not be verified for this event.");
      if (current === generation.current) { setMessage(`Server updated entry status to ${entry.status.replaceAll("_", " ")}.`); await load(); }
    } catch (reason) { if (current === generation.current) setError(reason instanceof Error ? reason.message : "The entry could not be updated."); }
    finally { if (current === generation.current) setBusy(false); }
  }
  async function more(kind:"crews"|"divisions") {
    const current=++generation.current;setBusy(true);setError("");
    try{if(kind==="crews"){const page=await connectedPage<Crew>(`/v1/chapters/${segment(session.chapter_id)}/crews`,crewCursor,session.uid);if(!Array.isArray(page.items)||page.items.some(c=>c.chapter_id!==session.chapter_id))throw new Error("Crew choices could not be verified for this chapter.");if(current===generation.current){setCrews(v=>[...v,...page.items.filter(c=>c.manager_uid===session.uid)]);setCrewCursor(page.next_page);}}else{const page=await connectedPage<Division>(`${root}/divisions`,divisionCursor,session.uid);if(!Array.isArray(page.items))throw new Error("Division choices could not be verified for this event.");if(current===generation.current){setDivisions(v=>[...v,...page.items]);setDivisionCursor(page.next_page);}}}
    catch(reason){if(current===generation.current)setError(reason instanceof Error?reason.message:"Unable to load more choices.");}finally{if(current===generation.current)setBusy(false);}
  }
  return <main id="main-content" className="workspace-main"><PageHeading title={entryId ? "Registration readiness" : "Register your crew"} description="Entry requirements and status are computed by the event service." /><div className="connected-stack">
    {!allowed ? <p role="alert" className="form-error">Your account does not have access to this chapter or review action.</p> : !eventId ? <p className="form-error">Open this page from its event registration link.</p> : entryId ? detail && <>
      <section className="panel"><h2>{detail.entry.division_id}</h2><p>Entry: {detail.entry.id}</p><p>Status: <strong>{detail.entry.status.replaceAll("_", " ")}</strong></p><dl className="review-list">{([['Roster', detail.readiness.roster_ready], ['Music', detail.readiness.music_ready], ['Consent', detail.readiness.consent_ready], ['Payment', detail.readiness.payment_ready]] as const).map(([label, ready]) => <div key={label}><dt>{label}</dt><dd>{ready ? "Ready" : "Action needed"}</dd></div>)}</dl>{detail.readiness.diagnostics.length > 0 && <ul>{detail.readiness.diagnostics.map(value => <li key={value}>{value}</li>)}</ul>}
      <div className="connected-actions">{review ? <><button className="button button-volt" disabled={busy || !detail.readiness.is_ready} onClick={() => act("approved")}>Approve ready entry</button><button className="button button-outline" disabled={busy} onClick={() => act("needs_correction")}>Request correction</button></> : session.role === "crew_manager" && <><button className="button button-volt" disabled={busy || !["draft", "needs_correction"].includes(detail.entry.status)} onClick={() => act()}>Submit for review</button><Link className="button button-outline" href={`/app/entries/${segment(entryId)}/checkout?event=${segment(eventId)}`}>Payment reference</Link></>}</div></section>
      <section className="panel"><h2>Entry roster snapshot</h2><ul>{detail.entry.roster.map(member => <li key={member.uid}>{member.name}{member.is_minor ? member.consent_verified ? " · Guardian consent verified" : " · Guardian consent pending" : ""}</li>)}</ul><p className="fineprint">Identity upload, consent signing and audio processing are still being connected. Their requirements remain pending until verified.</p></section>
      {!review && session.role === "crew_manager" && <AudioInspection key={`${session.uid}:${session.chapter_id}:${eventId}:${entryId}`} uid={session.uid} chapterId={session.chapter_id} eventId={eventId} entryId={entryId} revision={detail.entry.revision ?? 0} editable={["draft", "needs_correction"].includes(detail.entry.status)} />}
      {review && ["registrar", "chapter_director"].includes(session.role) && <MusicReview key={`${session.uid}:${session.chapter_id}:${eventId}:${entryId}`} uid={session.uid} chapterId={session.chapter_id} eventId={eventId} entryId={entryId} />}
      {review && ["registrar", "chapter_director"].includes(session.role) && <MusicPolicyDraft key={`${session.uid}:${session.chapter_id}:${eventId}:${detail.entry.division_id}`} uid={session.uid} chapterId={session.chapter_id} eventId={eventId} divisionId={detail.entry.division_id} canEdit={session.role === "chapter_director"} />}
      {((!review && session.role === "crew_manager") || (review && ["registrar", "chapter_director"].includes(session.role))) && <MusicAdvisory key={`${session.uid}:${session.chapter_id}:${eventId}:${entryId}`} uid={session.uid} chapterId={session.chapter_id} eventId={eventId} entryId={entryId} />}
      <button className="button button-outline" disabled={busy} onClick={load}>Refresh readiness</button>
    </> : <form onSubmit={create} className="panel"><label htmlFor="entry-crew">Your crew</label><select id="entry-crew" required value={crewId} onChange={e => setCrewId(e.target.value)}><option value="">Select crew</option>{crews.map(crew => <option key={crew.id} value={crew.id}>{crew.name}</option>)}</select><label htmlFor="entry-division">Event division</label><select id="entry-division" required value={divisionId} onChange={e => setDivisionId(e.target.value)}><option value="">Select division</option>{divisions.map(division => <option key={division.id} value={division.id}>{division.name}</option>)}</select><p className="field-help">These are the current development event settings. Official rule approval remains a release requirement.</p><button className="button button-volt" disabled={busy || !crewId || !divisionId}>{busy ? "Creating…" : "Create draft entry"}</button><Link href="/app/crews/new">Create a crew</Link></form>}
    {!entryId && <div className="connected-actions">{crewCursor&&<button className="button button-outline" disabled={busy} onClick={()=>void more("crews")}>Load more crews</button>}{divisionCursor&&<button className="button button-outline" disabled={busy} onClick={()=>void more("divisions")}>Load more divisions</button>}</div>}
    {entryId&&eventId&&!review&&detail&&session?.role === "crew_manager"&&<Link className="button button-outline" href={`/app/entries/${segment(entryId)}/roster?event=${segment(eventId)}`}>Select performers</Link>}
    {message && <p role="status">{message}</p>}{error && <p role="alert" className="form-error">{error}</p>}
  </div></main>;
}
