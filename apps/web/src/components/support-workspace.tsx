"use client";
import Link from "next/link";
import {useCallback,useEffect,useRef,useState,type FormEvent} from "react";
import {useWorkspaceSession,type WorkspaceSession} from "@/lib/account";
import {connectedPage,segment} from "@/lib/connected-api";
import {registrationCommand} from "@/lib/registration-command";
import type {InquiryInput,InquirySummary,StaffInquiry} from "@/lib/inquiries";
import {InquiryConversation} from "./inquiry-conversation";
import {PageHeading} from "./ui";

export function SupportWorkspace({chapterId}:{chapterId?:string}){
  const{session,user,loading,error}=useWorkspaceSession();
  if(loading)return <main className="workspace-main" id="main-content"><p role="status">Checking support access…</p></main>;
  if(!session)return <main className="workspace-main" id="main-content"><PageHeading title="Account support"/><p>{error||"Sign in to view your support requests."}</p><Link href="/sign-in">Sign in</Link><p>Need help before your chapter account is approved? <Link href="/contact">Send a contact inquiry here</Link>.</p></main>;
  const staff=["support","chapter_director"].includes(session.role);
  if(chapterId&&(session.chapter_id!==chapterId||!staff))return <main className="workspace-main" id="main-content"><p className="form-error" role="alert">You do not have support access to this chapter.</p></main>;
  return <SupportClient key={`${session.uid}/${session.chapter_id}`} session={session} staff={staff} name={user?.displayName||""} email={user?.email||""}/>;
}
function SupportClient({session,staff,name,email}:{session:WorkspaceSession;staff:boolean;name:string;email:string}){
  const [requests,setRequests]=useState<StaffInquiry[]>([]);const[cursor,setCursor]=useState<string|null>(null);const[selected,setSelected]=useState<string|null>(null);
  const[busy,setBusy]=useState(false);const[error,setError]=useState("");const[linkError,setLinkError]=useState("");const[receipt,setReceipt]=useState<string|null>(null);
  const[form,setForm]=useState<InquiryInput>({requester_name:name,email,category:"general",subject:"",message:""});
  const generation=useRef(0);
  const path=`/v1/chapters/${segment(session.chapter_id)}/support`;
  const load=useCallback(async(next?:string|null)=>{const current=++generation.current;setBusy(true);setError("");try{const page=await connectedPage<StaffInquiry>(path,next,session.uid);if(!Array.isArray(page.items)||page.items.some(value=>value.summary.chapter_id!==session.chapter_id)||(page.next_page!==null&&typeof page.next_page!=="string"))throw new Error("Support response could not be verified for this chapter.");if(current===generation.current){setRequests(values=>next?[...values,...page.items]:page.items);setCursor(page.next_page);}}catch(reason){if(current===generation.current)setError(reason instanceof Error?reason.message:"Unable to load inquiries.");}finally{if(current===generation.current)setBusy(false);}},[path,session.chapter_id,session.uid]);
  useEffect(()=>{void load();return()=>{generation.current++;};},[load]);
  useEffect(()=>{const query=new URLSearchParams(window.location.search);const chapter=query.get("chapter");const inquiry=query.get("inquiry");if(!chapter&&!inquiry)return;if(!chapter||!inquiry||chapter!==session.chapter_id){setLinkError("Switch to the chapter associated with this support request, then open the notification again.");return;}setLinkError("");setSelected(inquiry);},[session.chapter_id]);
  async function submit(event:FormEvent){event.preventDefault();const current=++generation.current;setBusy(true);setError("");try{const value=await registrationCommand<InquirySummary>(path,{...form},"POST",false,session.uid);if(value.chapter_id!==session.chapter_id||!value.id)throw new Error("Support receipt could not be verified for this chapter.");if(current===generation.current){setReceipt(value.id);setSelected(value.id);setForm({...form,subject:"",message:""});await load();}}catch(reason){if(current===generation.current)setError(reason instanceof Error?reason.message:"Your request was not saved.");}finally{if(current===generation.current)setBusy(false);}}
  return <main id="main-content" className="workspace-main"><PageHeading title={staff?"Chapter support":"Your support requests"} description={staff?"Review chapter inquiries and reply within this system.":"Send a request, read replies and track its current status."}/><div className="connected-stack support-workspace">
    <button className="button button-outline" disabled={busy} onClick={()=>void load()}>Refresh requests</button>
    {receipt&&<p role="status">Request saved. Reference: <span className="mono">{receipt}</span></p>}
    {linkError&&<p role="alert" className="form-error">{linkError}</p>}
    {!staff&&<details className="panel"><summary>Open a support request</summary><form onSubmit={submit}><label htmlFor="support-name">Your name</label><input id="support-name" required maxLength={100} value={form.requester_name} onChange={event=>setForm({...form,requester_name:event.target.value})}/><label htmlFor="support-email">Contact email</label><input id="support-email" type="email" required maxLength={254} value={form.email} onChange={event=>setForm({...form,email:event.target.value})}/><label htmlFor="support-topic">Topic</label><select id="support-topic" value={form.category} onChange={event=>setForm({...form,category:event.target.value})}>{["general","account","registration","payment","music","consent"].map(value=><option key={value}>{value}</option>)}</select><label htmlFor="support-subject">Subject</label><input id="support-subject" required maxLength={120} value={form.subject} onChange={event=>setForm({...form,subject:event.target.value})}/><label htmlFor="support-message">Message</label><textarea id="support-message" required rows={6} maxLength={4000} value={form.message} onChange={event=>setForm({...form,message:event.target.value})}/><p className="fineprint">Use references only. Upload identity documents, consent evidence and payment credentials through their dedicated private flows.</p><button className="button button-volt" disabled={busy}>{busy?"Saving…":"Send support request"}</button></form></details>}
    {!busy&&requests.length===0&&!error&&<p>No requests found on the pages loaded.</p>}
    <div className="inquiry-list">{requests.map(value=><article className="panel" key={value.summary.id}><h2>{value.summary.subject}</h2><p>{value.summary.category} · <strong>{value.summary.status.replaceAll("_"," ")}</strong></p>{staff&&<p>{value.requester_name} · {value.email}</p>}<p className="mono">{value.summary.id}</p><button className="button button-outline" onClick={()=>setSelected(value.summary.id)}>Open conversation</button></article>)}</div>
    {cursor&&<button className="button button-outline" disabled={busy} onClick={()=>void load(cursor)}>Load more requests</button>}
    {selected&&<InquiryConversation key={selected} chapter={session.chapter_id} id={selected} staff={staff} expectedUid={session.uid}/>}
    {error&&<p className="form-error" role="alert">{error}</p>}
  </div></main>;
}
