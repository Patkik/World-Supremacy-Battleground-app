"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useWorkspaceSession } from "@/lib/account";
import { ApiError, connectedRequest, segment } from "@/lib/connected-api";
import { PageHeading } from "./ui";

type Request = { request_id: string; chapter_id: string; subject_uid: string | null; guardian_uid: string | null; counterpart_available: boolean; status: string; revision: number };
type Command = { path: string; body: { operation_id: string; guardian_uid?: string; expected_revision?: number; decision?: string } };
const labels: Record<string, string> = { awaiting_guardian: "Awaiting guardian response", awaiting_verification: "Awaiting relationship verification", declined: "Declined", withdrawn: "Withdrawn" };

function validRequest(value: unknown, chapter: string, uid: string, role: string): value is Request {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<Request>;
  if (typeof item.request_id !== "string" || !/^[a-f0-9]{64}$/i.test(item.request_id)
    || item.chapter_id !== chapter || !Number.isSafeInteger(item.revision) || (item.revision ?? 0) < 1
    || typeof item.counterpart_available !== "boolean"
    || !["awaiting_guardian", "awaiting_verification", "declined", "withdrawn"].includes(item.status ?? "")) return false;
  const actorMatches = role === "dancer" ? item.subject_uid === uid : role === "guardian" && item.guardian_uid === uid;
  if (!actorMatches) return false;
  const other = role === "dancer" ? item.guardian_uid : item.subject_uid;
  return item.counterpart_available
    ? typeof other === "string" && other.length > 0 && other.length <= 200
    : other === null;
}

function isRecoverableCommand(value: unknown, endpoint: string): value is Command {
  if (!value || typeof value !== "object") return false;
  const command = value as Partial<Command>;
  const body = command.body;
  if (typeof command.path !== "string" || !body || typeof body !== "object" || typeof body.operation_id !== "string" || body.operation_id.length < 8 || body.operation_id.length > 100) return false;
  if (command.path === endpoint) return typeof body.guardian_uid === "string" && body.guardian_uid.length > 0 && body.guardian_uid.length <= 200;
  const action = command.path.slice(endpoint.length + 1);
  const match = action.match(/^([A-Za-z0-9_-]+)\/(respond|withdraw)$/);
  if (!command.path.startsWith(`${endpoint}/`) || !match || !Number.isSafeInteger(body.expected_revision) || (body.expected_revision ?? -1) < 0) return false;
  return match[2] === "withdraw" || body.decision === "confirm" || body.decision === "decline";
}

function validReceipt(value: unknown, command: Command, endpoint: string, chapter: string, uid: string, role: string): boolean {
  if (!value || typeof value !== "object") return false;
  const receipt = value as Partial<Request>;
  if (receipt.chapter_id !== chapter || typeof receipt.request_id !== "string"
    || !/^[a-f0-9]{64}$/i.test(receipt.request_id)) return false;
  if (command.path === endpoint) {
    return role === "dancer" && receipt.subject_uid === uid && receipt.guardian_uid === command.body.guardian_uid
      && receipt.status === "awaiting_guardian" && receipt.revision === 1;
  }
  const match = command.path.slice(endpoint.length + 1).match(/^([a-f0-9]{64})\/(respond|withdraw)$/i);
  if (!match || receipt.request_id !== match[1] || receipt.revision !== (command.body.expected_revision ?? -1) + 1) return false;
  if (match[2] === "withdraw") return receipt.status === "withdrawn" && validRequest(receipt, chapter, uid, role);
  return role === "guardian" && receipt.guardian_uid === uid && typeof receipt.subject_uid === "string"
    && receipt.status === (command.body.decision === "confirm" ? "awaiting_verification" : "declined");
}

function Requests({ uid, chapter, role, linkChapter, linkRequest }: { uid: string; chapter: string; role: string; linkChapter?: string; linkRequest?: string }) {
  const endpoint = `/v1/chapters/${segment(chapter)}/guardian-requests`;
  const recoveryKey = `wsb:guardian-request:${JSON.stringify([uid, chapter, role])}`;
  const [items, setItems] = useState<Request[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [linkedId, setLinkedId] = useState<string | null>(null);
  const [linkedItem, setLinkedItem] = useState<Request | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [guardian, setGuardian] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<Command | null>(null);
  const generation = useRef(0);
  const linkGeneration = useRef(0);
  const seenIds = useRef<Set<string>>(new Set());
  const sending = useRef(false);
  const load = useCallback(async (next?: string | null) => {
    const current = ++generation.current;
    if (!next) seenIds.current.clear();
    setLoading(true); setError("");
    try {
      const result = await connectedRequest<{ items: Request[]; next_page: string | null }>(`${endpoint}${next ? `?cursor=${segment(next)}` : ""}`, undefined, "GET", uid);
      if (!Array.isArray(result.items) || result.items.some(item => !validRequest(item, chapter, uid, role))
        || (result.next_page !== null && (typeof result.next_page !== "string" || !/^[a-f0-9]{64}$/i.test(result.next_page)))) throw new Error("Relationship requests could not be verified for this account and chapter.");
      const pageIds = result.items.map(item => item.request_id);
      if (pageIds.some((id, index) => index > 0 && pageIds[index - 1] >= id)
        || pageIds.some(id => seenIds.current.has(id))
        || (next && pageIds.some(id => id <= next))
        || (result.next_page && result.next_page <= (pageIds.at(-1) ?? next ?? ""))) throw new Error("Relationship request history returned a duplicate or invalid page cursor.");
      if (current === generation.current) {
        pageIds.forEach(id => seenIds.current.add(id));
        setItems(previous => next ? [...previous, ...result.items] : result.items);
        setCursor(result.next_page);
      }
    } catch (reason) { if (current === generation.current) { if (!next) { seenIds.current.clear(); setItems([]); setCursor(null); } setError(reason instanceof Error ? reason.message : "Requests could not be loaded."); } }
    finally { if (current === generation.current) setLoading(false); }
  }, [endpoint, uid]);
  const loadLinked = useCallback(async (id: string) => {
    const current = ++linkGeneration.current;
    setLinkLoading(true); setLinkError("");
    try {
      const item = await connectedRequest<Request>(`${endpoint}/${segment(id)}`, undefined, "GET", uid);
      if (item.request_id !== id || !validRequest(item, chapter, uid, role)) throw new Error("The linked request could not be verified for this account.");
      if (current === linkGeneration.current) setLinkedItem(item);
    } catch (reason) {
      if (current === linkGeneration.current) { setLinkedItem(null); setLinkError(reason instanceof ApiError && [403, 404].includes(reason.status) ? "This request is unavailable to your account in the selected chapter." : reason instanceof Error ? reason.message : "The linked request could not be opened."); }
    } finally { if (current === linkGeneration.current) setLinkLoading(false); }
  }, [chapter, endpoint, role, uid]);
  useEffect(() => {
    setLinkedId(null); setLinkedItem(null); setLinkError(""); setLinkLoading(false);
    if (!linkChapter && !linkRequest) return;
    if (!linkChapter || linkChapter !== chapter) { setLinkError("Switch to the chapter associated with this request, then open the notification again."); return; }
    if (!linkRequest || !/^[a-f0-9]{64}$/i.test(linkRequest)) { setLinkError("The request reference in this link is invalid."); return; }
    setLinkedId(linkRequest); void loadLinked(linkRequest);
    return () => { linkGeneration.current++; };
  }, [chapter, linkChapter, linkRequest, loadLinked]);
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(recoveryKey);
      if (!saved) return;
      const command: unknown = JSON.parse(saved);
      if (isRecoverableCommand(command, endpoint)) setPending(command);
      else sessionStorage.removeItem(recoveryKey);
    } catch {
      setError("This tab could not restore the saved request retry. Refresh the page or start a new request.");
    }
  }, [endpoint, recoveryKey]);
  useEffect(() => { void load(); return () => { generation.current++; }; }, [load]);
  async function send(command: Command) {
    if (sending.current) return;
    if (!isRecoverableCommand(command, endpoint)) { setError("This request cannot be safely recovered. Refresh the page and try again."); return; }
    try { sessionStorage.setItem(recoveryKey, JSON.stringify(command)); }
    catch { setError("This tab cannot save a retry reference, so the request was not sent. Enable session storage and try again."); return; }
    sending.current = true; setBusy(true); setError(""); setMessage(""); setPending(command);
    const current = generation.current;
    try {
      const receipt = await connectedRequest<unknown>(command.path, command.body, "POST", uid);
      if (!validReceipt(receipt, command, endpoint, chapter, uid, role)) throw new Error("The server response could not be verified. Retry the saved request or refresh the list before clearing it.");
      sessionStorage.removeItem(recoveryKey);
      if (current !== generation.current) return;
      setPending(null); setGuardian(""); setMessage("Response saved. Relationship verification and event consent remain separate steps.");
      setBusy(false);
      await load();
      if (linkedId) await loadLinked(linkedId);
    } catch (reason) { if (current === generation.current) {
      if (reason instanceof ApiError && [400, 404, 409, 422].includes(reason.status)) {
        try { sessionStorage.removeItem(recoveryKey); } catch { /* A stale recovery entry is harmless and will be replaced. */ }
        setPending(null);
      }
      setError(reason instanceof Error ? reason.message : "The request could not be saved. Retry to recover the same operation.");
    } }
    finally { sending.current = false; if (current === generation.current) setBusy(false); }
  }
  function create(event: FormEvent) {
    event.preventDefault();
    const value = guardian.trim();
    if (!value || value.length > 200 || value.includes("/") || value === uid) { setError("Enter another guardian account reference from this chapter."); return; }
    void send({ path: endpoint, body: { operation_id: crypto.randomUUID(), guardian_uid: value } });
  }
  function forgetPending() {
    try { sessionStorage.removeItem(recoveryKey); } catch { /* State still clears for this mounted page. */ }
    setPending(null); setError("");
    setMessage("The retry reference was cleared from this tab. Refresh the list to check whether the server already saved the request.");
  }
  const visibleItems = linkedItem ? [linkedItem, ...items.filter(item => item.request_id !== linkedItem.request_id)] : items;
  return <div className="connected-stack">
    <p>Request and respond to a guardian relationship using your chapter account. A confirmed request awaits verification and grants no dependent access or consent authority.</p>
    {role === "dancer" && <form className="panel" onSubmit={create}><label htmlFor="guardian-reference">Guardian account reference</label><input id="guardian-reference" required maxLength={200} value={guardian} disabled={busy || !!pending} onChange={event => setGuardian(event.target.value)} /><p className="fineprint">Ask the guardian for their account reference. They must have an active guardian account in this chapter.</p><button type="submit" className="button button-volt" disabled={busy || !!pending}>Request relationship</button></form>}
    {error && <p role="alert" className="form-error">{error}</p>}
    {linkError && <p role="alert" className="form-error">{linkError}</p>}
    {linkLoading && <p role="status">Opening the linked request…</p>}
    {message && <p role="status">{message}</p>}
    {pending && <div className="panel"><p>A request may still be processing. Retry with the same operation to recover its saved outcome. Clearing this retry only removes the tab's recovery reference; it does not cancel a request the server already saved.</p><div className="button-row"><button type="button" className="button button-outline" disabled={busy} onClick={() => void send(pending)}>Retry saved request</button><button type="button" className="button button-outline" disabled={busy} onClick={forgetPending}>Clear retry reference</button></div></div>}
    <button type="button" className="button button-outline" disabled={busy || loading || linkLoading} onClick={() => { void (async () => { await load(); if (linkedId) await loadLinked(linkedId); })(); }}>Refresh relationships</button>
    {loading ? <p role="status">Loading requests…</p> : !linkLoading && !linkError && !error && visibleItems.length === 0 ? <p>{cursor ? "No visible requests on the loaded pages. Load more to continue." : "No relationship requests are available."}</p> : null}
    {visibleItems.map(item => <article className="panel" key={item.request_id}><h2>{(role === "guardian" ? item.subject_uid : item.guardian_uid) || "Account unavailable"}</h2><p>{labels[item.status] || "Unknown request status"}</p>{!item.counterpart_available && <p>The other account is not currently available in this chapter. You can withdraw this pending request.</p>}<p className="fineprint">Request {item.request_id} · Revision {item.revision}</p>{role === "guardian" && item.counterpart_available && item.status === "awaiting_guardian" && <div className="button-row">{["confirm", "decline"].map(decision => <button type="button" className="button button-outline" disabled={busy || !!pending} key={decision} onClick={() => void send({ path: `${endpoint}/${segment(item.request_id)}/respond`, body: { operation_id: crypto.randomUUID(), expected_revision: item.revision, decision } })}>{decision === "confirm" ? "Confirm relationship request" : "Decline request"}</button>)}</div>}{["awaiting_guardian", "awaiting_verification"].includes(item.status) && <button type="button" className="button button-outline" disabled={busy || !!pending} onClick={() => void send({ path: `${endpoint}/${segment(item.request_id)}/withdraw`, body: { operation_id: crypto.randomUUID(), expected_revision: item.revision } })}>Withdraw relationship request</button>}</article>)}
    {cursor && <button type="button" className="button button-outline" disabled={busy || loading} onClick={() => void load(cursor)}>Load more requests</button>}
  </div>;
}

export function GuardianRequests({ linkChapter, linkRequest }: { linkChapter?: string; linkRequest?: string }) {
  const { session, loading, error } = useWorkspaceSession();
  const next = linkChapter && linkChapter.length <= 200 && !linkChapter.includes("/") && linkRequest && /^[a-f0-9]{64}$/i.test(linkRequest) ? `/app/dependents?${new URLSearchParams({chapter: linkChapter, request: linkRequest})}` : "/app/dependents";
  return <main id="main-content" className="workspace-main"><PageHeading title="Guardian relationships" description="Manage relationship requests before verification and event consent." />{loading ? <p role="status">Checking chapter access…</p> : !session ? <><p>{error || "Sign in to continue."}</p><Link className="button button-outline" href={`/sign-in?next=${segment(next)}`}>Sign in</Link></> : !["guardian", "dancer"].includes(session.role) ? <p>This workspace is available to dancers and guardians.</p> : <Requests key={`${session.uid}:${session.chapter_id}:${session.role}`} uid={session.uid} chapter={session.chapter_id} role={session.role} linkChapter={linkChapter} linkRequest={linkRequest} />}</main>;
}
