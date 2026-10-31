"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useWorkspaceSession } from "@/lib/account";
import { connectedPage, segment } from "@/lib/connected-api";
import type { Entry } from "@/lib/api";
import { PageHeading } from "./ui";
export function RegistrationList({chapterId,eventId}:{chapterId:string;eventId:string}){
  const {session,loading,error:sessionError}=useWorkspaceSession();const [entries,setEntries]=useState<Entry[]>([]);const [cursor,setCursor]=useState<string|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState("");
  const allowed=!!session&&session.chapter_id===chapterId&&["registrar","chapter_director"].includes(session.role);
  const load=useCallback(async(next?:string|null)=>{if(!allowed)return;setBusy(true);setError("");try{const page=await connectedPage<Entry>(`/v1/chapters/${segment(chapterId)}/events/${segment(eventId)}/entries`,next);setEntries(values=>next?[...values,...page.items]:page.items);setCursor(page.next_page);}catch(reason){setError(reason instanceof Error?reason.message:"Unable to load registrations.");}finally{setBusy(false);}},[allowed,chapterId,eventId]);
  useEffect(()=>{void load();},[load]);
  return <main id="main-content" className="workspace-main"><PageHeading title="Event registrations" description="Review the server's current entry records and readiness."/><div className="connected-stack">{loading?<p role="status">Checking registrar access…</p>:!allowed?<><p>{sessionError||"Registrar access to this chapter is required."}</p><Link href="/workspaces">Account access</Link></>:<><button disabled={busy} className="button button-outline" onClick={()=>void load()}>Refresh registrations</button>{!busy&&entries.length===0&&!error&&<p>No entries found on the pages loaded.</p>}{entries.map(entry=><article className="panel" key={entry.id}><h2>{entry.crew_id}</h2><p>{entry.division_id} · {entry.status.replaceAll("_"," ")} · {entry.roster.length} performers</p><Link className="button button-outline" href={`/admin/${segment(chapterId)}/events/${segment(eventId)}/registrations/${segment(entry.id)}`}>Review entry</Link></article>)}{cursor&&<button className="button button-outline" disabled={busy} onClick={()=>void load(cursor)}>Load more registrations</button>}</>}{error&&<p className="form-error" role="alert">{error}</p>}</div></main>;
}
