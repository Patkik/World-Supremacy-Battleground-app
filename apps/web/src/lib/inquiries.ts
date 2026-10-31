"use client";
import { apiBase, ApiError } from "./connected-api";
export type InquiryStatus="open"|"in_progress"|"waiting_on_requester"|"resolved";
export type InquirySummary={id:string;chapter_id:string;subject:string;category:string;status:InquiryStatus;revision:number;created_at:number;updated_at:number};
export type InquiryMessage={sequence:number;source:string;body:string;status:InquiryStatus;created_at:number};
export type InquiryPage<T>={items:T[];next_page:string|null};
export type InquiryThread={inquiry:InquirySummary;messages:InquiryPage<InquiryMessage>};
export type StaffInquiry={summary:InquirySummary;requester_name:string;email:string};
export type ContactAccess={chapter:string;id:string;secret:string};
export type InquiryInput={subject:string;category:string;requester_name:string;email:string;message:string};
export async function contactRequest<T>(path:string,secret?:string,body?:unknown):Promise<T>{
  const response=await fetch(`${apiBase}${path}`,{method:body===undefined?"GET":"POST",cache:"no-store",signal:AbortSignal.timeout(12000),headers:{...(secret?{Authorization:`Contact ${secret}`} :{}),...(body===undefined?{}:{"Content-Type":"application/json"})},body:body===undefined?undefined:JSON.stringify(body)});
  if(!response.ok)throw new ApiError(response.status,response.status===404?"This request is unavailable, or the access key does not match.":response.status===409?"This conversation changed. Reload it before replying.":response.status===429?"Too many requests. Please wait before sending another.":"Your request could not be saved. Check your connection and try again.");
  return response.json() as Promise<T>;
}
export function savedContacts():ContactAccess[]{try{return JSON.parse(sessionStorage.getItem("wsb-contact-requests")||"[]") as ContactAccess[];}catch{return[];}}
export function rememberContact(value:ContactAccess){const values=savedContacts().filter(v=>v.chapter!==value.chapter||v.id!==value.id);sessionStorage.setItem("wsb-contact-requests",JSON.stringify([...values,value]));}
export async function contactCommand<T>(path:string,secret:string,body:Record<string,unknown>):Promise<T>{
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify([path,secret,body])))),n=>n.toString(16).padStart(2,"0")).join("");
  const key=`wsb-contact-update:${digest}`;const operation_id=sessionStorage.getItem(key)||crypto.randomUUID();sessionStorage.setItem(key,operation_id);
  try{const value=await contactRequest<T>(path,secret,{...body,operation_id});sessionStorage.removeItem(key);return value;}
  catch(error){if(error instanceof ApiError&&[400,403,404,409,422].includes(error.status))sessionStorage.removeItem(key);throw error;}
}
export async function createContact(chapter:string,body:InquiryInput){
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify([chapter,body])))),n=>n.toString(16).padStart(2,"0")).join("");
  const key=`wsb-contact-intent:${digest}`;
  const stored=sessionStorage.getItem(key);
  const intent=stored?JSON.parse(stored) as {operation_id:string;secret:string}:{operation_id:crypto.randomUUID(),secret:Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,"0")).join("")};
  sessionStorage.setItem(key,JSON.stringify(intent));
  try{
    const receipt=await contactRequest<InquirySummary>(`/v1/chapters/${encodeURIComponent(chapter)}/contact`,intent.secret,{...body,operation_id:intent.operation_id});
    const access={chapter,id:receipt.id,secret:intent.secret};rememberContact(access);sessionStorage.removeItem(key);return{receipt,access};
  }catch(error){if(error instanceof ApiError&&[400,403,404,409,422].includes(error.status))sessionStorage.removeItem(key);throw error;}
}
