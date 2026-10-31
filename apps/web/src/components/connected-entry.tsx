"use client";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useWorkspaceSession } from "@/lib/account";
import { connectedPage, connectedRequest, segment } from "@/lib/connected-api";
import type { Crew, Division, Entry, EntryDetailResponse } from "@/lib/api";
import { PageHeading } from "./ui";
import { registrationCommand } from "@/lib/registration-command";

export function ConnectedEntry({ eventId, entryId, chapterId, review = false }: { eventId: string | null; entryId?: string; chapterId?: string; review?: boolean }) {
  const { session, loading, error: sessionError } = useWorkspaceSession();
  const [crews, setCrews] = useState<Crew[]>([]); const [divisions, setDivisions] = useState<Division[]>([]);
  const [crewId, setCrewId] = useState(""); const [divisionId, setDivisionId] = useState("");
  const [crewCursor,setCrewCursor]=useState<string|null>(null);const [divisionCursor,setDivisionCursor]=useState<string|null>(null);
  const [detail, setDetail] = useState<EntryDetailResponse | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const router = useRouter();
  const allowed = !!session && (!chapterId || chapterId === session.chapter_id);
  const root = session && eventId ? `/v1/chapters/${segment(session.chapter_id)}/events/${segment(eventId)}` : "";
  const load = useCallback(async () => {
    if (!session || !eventId || !allowed) return;
    setBusy(true); setError("");
    try {
      if (entryId) setDetail(await connectedRequest<EntryDetailResponse>(`${root}/entries/${segment(entryId)}`));
      else {
        const [crewData, divisionData] = await Promise.all([connectedPage<Crew>(`/v1/chapters/${segment(session.chapter_id)}/crews`), connectedPage<Division>(`${root}/divisions`)]);
        setCrews(crewData.items.filter(crew => crew.manager_uid === session.uid)); setDivisions(divisionData.items);setCrewCursor(crewData.next_page);setDivisionCursor(divisionData.next_page);
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to open this entry."); }
    finally { setBusy(false); }
  }, [session, eventId, entryId, root, allowed]);
  useEffect(() => { void load(); }, [load]);
  async function create(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const entry = await registrationCommand<Entry>(`${root}/entries`, { crew_id: crewId, division_id: divisionId });
      router.push(`/app/entries/${segment(entry.id)}?event=${segment(entry.event_id)}`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to create entry."); }
    finally { setBusy(false); }
  }
  async function act(status?: "approved" | "needs_correction") {
    if (!entryId || !detail) return;
    setBusy(true); setError("");
    try {
      const entry = await registrationCommand<Entry>(`${root}/entries/${segment(entryId)}/${status ? "review" : "submit"}`, {expected_revision:detail.entry.revision??0,...(status?{status}:{})});
      setMessage(`Server updated entry status to ${entry.status.replaceAll("_", " ")}.`); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The entry could not be updated."); }
    finally { setBusy(false); }
  }
  async function more(kind:"crews"|"divisions") {
    if(!session)return;setBusy(true);setError("");
    try{if(kind==="crews"){const page=await connectedPage<Crew>(`/v1/chapters/${segment(session.chapter_id)}/crews`,crewCursor);setCrews(v=>[...v,...page.items.filter(c=>c.manager_uid===session.uid)]);setCrewCursor(page.next_page);}else{const page=await connectedPage<Division>(`${root}/divisions`,divisionCursor);setDivisions(v=>[...v,...page.items]);setDivisionCursor(page.next_page);}}
    catch(reason){setError(reason instanceof Error?reason.message:"Unable to load more choices.");}finally{setBusy(false);}
  }
  return <main id="main-content" className="workspace-main"><PageHeading title={entryId ? "Registration readiness" : "Register your crew"} description="Entry requirements and status are computed by the event service." /><div className="connected-stack">
    {loading ? <p role="status">Checking chapter access…</p> : !session ? <><p className="form-error">{sessionError || "Sign in to continue."}</p><Link href={`/sign-in?next=${segment(`/app/register/${eventId||""}`)}`}>Sign in</Link></> : !allowed ? <p role="alert" className="form-error">This chapter is outside your account’s access.</p> : !eventId ? <p className="form-error">Open this page from its event registration link.</p> : entryId ? detail && <>
      <section className="panel"><h2>{detail.entry.division_id}</h2><p>Entry: {detail.entry.id}</p><p>Status: <strong>{detail.entry.status.replaceAll("_", " ")}</strong></p><dl className="review-list">{([['Roster', detail.readiness.roster_ready], ['Music', detail.readiness.music_ready], ['Consent', detail.readiness.consent_ready], ['Payment', detail.readiness.payment_ready]] as const).map(([label, ready]) => <div key={label}><dt>{label}</dt><dd>{ready ? "Ready" : "Action needed"}</dd></div>)}</dl>{detail.readiness.diagnostics.length > 0 && <ul>{detail.readiness.diagnostics.map(value => <li key={value}>{value}</li>)}</ul>}
      <div className="connected-actions">{review ? <><button className="button button-volt" disabled={busy || !detail.readiness.is_ready} onClick={() => act("approved")}>Approve ready entry</button><button className="button button-outline" disabled={busy} onClick={() => act("needs_correction")}>Request correction</button></> : <><button className="button button-volt" disabled={busy || !["draft", "needs_correction"].includes(detail.entry.status)} onClick={() => act()}>Submit for review</button><Link className="button button-outline" href={`/app/entries/${segment(entryId)}/checkout?event=${segment(eventId)}`}>Payment reference</Link></>}</div></section>
      <section className="panel"><h2>Entry roster snapshot</h2><ul>{detail.entry.roster.map(member => <li key={member.uid}>{member.name}{member.is_minor ? member.consent_verified ? " · Guardian consent verified" : " · Guardian consent pending" : ""}</li>)}</ul><p className="fineprint">Identity upload, consent signing and audio processing are still being connected. Their requirements remain pending until verified.</p></section>
      <button className="button button-outline" disabled={busy} onClick={load}>Refresh readiness</button>
    </> : <form onSubmit={create} className="panel"><label htmlFor="entry-crew">Your crew</label><select id="entry-crew" required value={crewId} onChange={e => setCrewId(e.target.value)}><option value="">Select crew</option>{crews.map(crew => <option key={crew.id} value={crew.id}>{crew.name}</option>)}</select><label htmlFor="entry-division">Event division</label><select id="entry-division" required value={divisionId} onChange={e => setDivisionId(e.target.value)}><option value="">Select division</option>{divisions.map(division => <option key={division.id} value={division.id}>{division.name}</option>)}</select><p className="field-help">These are the current development event settings. Official rule approval remains a release requirement.</p><button className="button button-volt" disabled={busy || !crewId || !divisionId}>{busy ? "Creating…" : "Create draft entry"}</button><Link href="/app/crews/new">Create a crew</Link></form>}
    {!entryId && <div className="connected-actions">{crewCursor&&<button className="button button-outline" disabled={busy} onClick={()=>void more("crews")}>Load more crews</button>}{divisionCursor&&<button className="button button-outline" disabled={busy} onClick={()=>void more("divisions")}>Load more divisions</button>}</div>}
    {entryId&&eventId&&!review&&detail&&<Link className="button button-outline" href={`/app/entries/${segment(entryId)}/roster?event=${segment(eventId)}`}>Select performers</Link>}
    {message && <p role="status">{message}</p>}{error && <p role="alert" className="form-error">{error}</p>}
  </div></main>;
}
