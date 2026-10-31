"use client";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useWorkspaceSession } from "@/lib/account";
import { connectedRequest, segment } from "@/lib/connected-api";
import { registrationCommand } from "@/lib/registration-command";
import type { Crew, Entry, EntryDetailResponse } from "@/lib/api";
import { PageHeading } from "./ui";

export function ConnectedRoster({entryId,eventId}:{entryId:string;eventId:string|null}) {
  const {session,loading,error:sessionError}=useWorkspaceSession();
  const [detail,setDetail]=useState<EntryDetailResponse|null>(null);const [crew,setCrew]=useState<Crew|null>(null);
  const [selected,setSelected]=useState<string[]>([]);const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [message,setMessage]=useState("");
  const root=session&&eventId?`/v1/chapters/${segment(session.chapter_id)}/events/${segment(eventId)}/entries/${segment(entryId)}`:"";
  const load=useCallback(async()=>{
    if(!session||!eventId)return;setBusy(true);setError("");
    try{const value=await connectedRequest<EntryDetailResponse>(root);const group=await connectedRequest<Crew>(`/v1/chapters/${segment(session.chapter_id)}/crews/${segment(value.entry.crew_id)}`);setDetail(value);setCrew(group);setSelected(value.entry.roster.map(m=>m.uid));}
    catch(reason){setError(reason instanceof Error?reason.message:"Unable to load performers.");}finally{setBusy(false);}
  },[session,eventId,root]);
  useEffect(()=>{void load();},[load]);
  const editable=!!session&&!!detail&&crew?.manager_uid===session.uid&&["draft","needs_correction"].includes(detail.entry.status)&&detail.entry.paid_minor===0&&(detail.pending_minor??0)===0;
  async function save(event:FormEvent){
    event.preventDefault();if(!detail||!editable)return;setBusy(true);setError("");setMessage("");
    try{const entry=await registrationCommand<Entry>(`${root}/roster`,{expected_revision:detail.entry.revision??0,roster:selected},"PUT");setDetail({...detail,entry});setMessage("Performer roster saved by the event service.");}
    catch(reason){setError(reason instanceof Error?reason.message:"Unable to save performers.");}finally{setBusy(false);}
  }
  return <main id="main-content" className="workspace-main"><PageHeading title="Select performers" description="Choose the dancers who will perform in this event entry. Crew membership and an event roster are separate."/><div className="connected-stack">
    {loading?<p role="status">Checking chapter access…</p>:!session?<><p>{sessionError||"Sign in to continue."}</p><Link href="/sign-in">Sign in</Link></>:!eventId?<p className="form-error">Open this page from your event entry.</p>:detail&&crew&&<form className="panel" onSubmit={save}>
      <h2>{crew.name}</h2><p>{selected.length} selected · {detail.entry.status.replaceAll("_"," ")}</p>
      {!editable&&<p className="info-note">Only the crew manager can edit an unpaid draft or correction. Settled or pending payments and approved entries require review before the roster can change.</p>}
      {crew.members.length===0&&<p>No dancers have joined this crew. Create an invitation from crew details. A manager who performs must also join the performer roster.</p>}
      {crew.members.map(member=><label key={member.uid} className="trust-device"><input type="checkbox" disabled={!editable||busy} checked={selected.includes(member.uid)} onChange={event=>setSelected(values=>event.target.checked?[...values,member.uid]:values.filter(uid=>uid!==member.uid))}/><span>{member.name}{member.is_minor?member.consent_verified?" · Guardian consent verified":" · Guardian consent pending":""}</span></label>)}
      <p className="fineprint">Identity and consent are checked separately. Selecting a name cannot mark those checks complete.</p>
      <button className="button button-volt" disabled={!editable||busy}>{busy?"Saving…":"Save performers"}</button>
    </form>}
    {session&&eventId&&<div className="connected-actions"><button className="button button-outline" disabled={busy} onClick={()=>void load()}>Reload roster</button><Link className="button button-outline" href={`/app/entries/${segment(entryId)}?event=${segment(eventId)}`}>Back to readiness</Link>{crew&&<Link href={`/app/crews/${segment(crew.id)}`}>Crew invitations</Link>}</div>}
    {message&&<p role="status">{message}</p>}{error&&<p className="form-error" role="alert">{error}</p>}
  </div></main>;
}
