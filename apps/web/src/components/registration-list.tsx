"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useWorkspaceSession, type WorkspaceSession } from "@/lib/account";
import { ApiError, connectedPage, segment } from "@/lib/connected-api";
import type { Entry } from "@/lib/api";
import { PageHeading } from "./ui";
export function RegistrationList({chapterId,eventId}:{chapterId:string;eventId:string}){
  const {session,loading,error:sessionError}=useWorkspaceSession(chapterId);
  if(!session)return <main id="main-content" className="workspace-main"><PageHeading title="Event registrations" description="Review the server's current entry records and readiness."/><div className="connected-stack">{loading?<p role="status">Checking registrar access…</p>:<><p>{sessionError||"Registrar access to this chapter is required."}</p><Link href="/workspaces">Account access</Link></>}</div></main>;
  return <RegistrationQueue key={`${session.uid}:${chapterId}:${eventId}`} chapterId={chapterId} eventId={eventId} session={session}/>;
}

function RegistrationQueue({chapterId,eventId,session}:{chapterId:string;eventId:string;session:WorkspaceSession}){
  const [entries,setEntries]=useState<Entry[]>([]);const [cursor,setCursor]=useState<string|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState("");const generation=useRef(0);
  const allowed=session.chapter_id===chapterId&&["registrar","chapter_director"].includes(session.role);
  const load=useCallback(async(next?:string|null)=>{if(!allowed)return;const current=++generation.current;setBusy(true);setError("");try{const page=await connectedPage<Entry>(`/v1/chapters/${segment(chapterId)}/events/${segment(eventId)}/entries`,next,session.uid);if(!Array.isArray(page.items)||page.items.some(entry=>entry.chapter_id!==chapterId||entry.event_id!==eventId||typeof entry.id!=="string"||!entry.id||!Array.isArray(entry.roster))||(page.next_page!==null&&typeof page.next_page!=="string"))throw new Error("Registration records could not be verified for this chapter and event.");if(current===generation.current){setEntries(values=>next?[...values,...page.items]:page.items);setCursor(page.next_page);}}catch(reason){if(current===generation.current){if(!next||reason instanceof ApiError&&[401,403].includes(reason.status)){setEntries([]);setCursor(null);}setError(reason instanceof Error?reason.message:"Unable to load registrations.");}}finally{if(current===generation.current)setBusy(false);}},[allowed,chapterId,eventId,session.uid]);
  useEffect(()=>{void load();return()=>{generation.current++;};},[load]);
  return <main id="main-content" className="workspace-main"><PageHeading title="Event registrations" description="Review the server's current entry records and readiness."/><div className="connected-stack">{!allowed?<><p>Registrar access to this chapter is required.</p><Link href="/workspaces">Account access</Link></>:<><button disabled={busy} className="button button-outline" onClick={()=>void load()}>Refresh registrations</button>{!busy&&entries.length===0&&!error&&<p>No entries found on the pages loaded.</p>}{entries.map(entry=><article className="panel" key={entry.id}><h2>{entry.crew_id}</h2><p>{entry.division_id} · {entry.status.replaceAll("_"," ")} · {entry.roster.length} performers</p><Link className="button button-outline" href={`/admin/${segment(chapterId)}/events/${segment(eventId)}/registrations/${segment(entry.id)}`}>Review entry</Link></article>)}{cursor&&<button className="button button-outline" disabled={busy} onClick={()=>void load(cursor)}>Load more registrations</button>}</>}{error&&<p className="form-error" role="alert">{error}</p>}</div></main>;
}
