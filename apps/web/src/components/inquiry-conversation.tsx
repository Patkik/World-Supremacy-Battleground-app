"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { connectedRequest, segment } from "@/lib/connected-api";
import { registrationCommand } from "@/lib/registration-command";
import { contactCommand,contactRequest, type ContactAccess, type InquiryMessage, type InquiryStatus, type InquirySummary, type InquiryThread } from "@/lib/inquiries";

export function InquiryConversation({chapter,id,contact,staff=false}:{chapter:string;id:string;contact?:ContactAccess;staff?:boolean}){
  const [thread,setThread]=useState<InquiryThread|null>(null);const [rows,setRows]=useState<InquiryMessage[]>([]);const [cursor,setCursor]=useState<string|null>(null);
  const [message,setMessage]=useState("");const [status,setStatus]=useState<InquiryStatus>("in_progress");const [busy,setBusy]=useState(false);const [error,setError]=useState("");
  const path=`/v1/chapters/${segment(chapter)}/${contact?"contact":"support"}/${segment(id)}`;
  const load=useCallback(async(next?:string|null)=>{
    setBusy(true);setError("");try{const url=`${path}${next?`?cursor=${segment(next)}`:""}`;const value=contact?await contactRequest<InquiryThread>(url,contact.secret):await connectedRequest<InquiryThread>(url);setThread(value);setRows(previous=>next?[...previous,...value.messages.items]:value.messages.items);setCursor(value.messages.next_page);}
    catch(reason){setError(reason instanceof Error?reason.message:"Unable to open the conversation.");}finally{setBusy(false);}
  },[path,contact]);
  useEffect(()=>{void load();},[load]);
  async function reply(event:FormEvent){event.preventDefault();if(!thread)return;setBusy(true);setError("");
    const body={expected_revision:thread.inquiry.revision,message,...(staff?{status}:{})};
    try{
      if(contact)await contactCommand<InquirySummary>(path,contact.secret,body);
      else await registrationCommand<InquirySummary>(path,body);
      setMessage("");await load();
    }catch(reason){setError(reason instanceof Error?reason.message:"Your reply was not saved.");}finally{setBusy(false);}
  }
  return <section className="panel inquiry-conversation"><div className="connected-actions"><button className="button button-outline" disabled={busy} onClick={()=>void load()}>Reload conversation</button></div>
    {thread&&<><h2>{thread.inquiry.subject}</h2><p>Reference: <span className="mono">{id}</span></p><p>Status: <strong>{thread.inquiry.status.replaceAll("_"," ")}</strong></p>
    <ol className="inquiry-messages">{rows.map(row=><li key={row.sequence}><strong>{row.source==="chapter_support"?"Chapter support":"Requester"}</strong><time dateTime={new Date(row.created_at*1000).toISOString()}>{new Date(row.created_at*1000).toLocaleString()}</time>{row.body&&<p>{row.body}</p>}<span className="fineprint">Status: {row.status.replaceAll("_"," ")}</span></li>)}</ol>
    {cursor&&<button className="button button-outline" disabled={busy} onClick={()=>void load(cursor)}>Load more messages</button>}
    <form onSubmit={reply}><label htmlFor={`inquiry-reply-${id}`}>{staff?"Reply visible to requester":"Your reply"}</label><textarea id={`inquiry-reply-${id}`} value={message} onChange={event=>setMessage(event.target.value)} required={!staff} maxLength={4000} rows={5}/>
    {staff&&<><label htmlFor={`inquiry-state-${id}`}>Request status</label><select id={`inquiry-state-${id}`} value={status} onChange={event=>setStatus(event.target.value as InquiryStatus)}>{(["open","in_progress","waiting_on_requester","resolved"] as const).map(value=><option key={value} value={value}>{value.replaceAll("_"," ")}</option>)}</select><p className="fineprint">Replies and status updates are visible to the requester. Financial, registration and judging actions need their own authorized review.</p></>}
    <button className="button button-volt" disabled={busy}>{busy?"Saving…":staff?"Save response":"Send reply"}</button></form></>}
    {error&&<p className="form-error" role="alert">{error}</p>}
  </section>;
}
