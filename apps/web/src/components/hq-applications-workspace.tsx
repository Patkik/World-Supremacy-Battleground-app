"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { PageHeading, Status } from "@/components/ui";
import { ApiError, connectedPage, connectedRequest, segment } from "@/lib/connected-api";
import { globalHqSession } from "@/lib/api";
import { registrationCommand } from "@/lib/registration-command";

type HqSession = { uid: string; role: string };
type InquiryStatus = "open" | "in_progress" | "waiting_on_requester" | "resolved";
type Summary = { id: string; chapter_id: string; subject: string; category: string; status: InquiryStatus; revision: number; created_at: number; updated_at: number };
type Application = { summary: Summary; requester_name: string; email: string };
type Message = { sequence: number; source: string; body: string; status: InquiryStatus; created_at: number };
type Thread = { inquiry: Summary; messages: { items: Message[]; next_page: string | null } };
const statuses: InquiryStatus[] = ["open", "in_progress", "waiting_on_requester", "resolved"];

export function HqApplicationsWorkspace() {
  const [session, setSession] = useState<HqSession | null>(null);
  const [items, setItems] = useState<Application[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [selected, setSelected] = useState<Application | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageCursor, setMessageCursor] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [status, setStatus] = useState<InquiryStatus>("in_progress");
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const listGeneration = useRef(0);
  const threadGeneration = useRef(0);

  useEffect(() => {
    let active = true;
    globalHqSession().then(value => { if (active) setSession(value); })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : "Global access could not be verified."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function loadList(next?: string | null) {
    if (!session) return;
    const generation = ++listGeneration.current;
    setLoading(true); setError("");
    try {
      const page = await connectedPage<Application>("/v1/hq/applications", next, session.uid);
      if (!Array.isArray(page.items) || page.items.some(item => !item.summary?.id || typeof item.summary.chapter_id !== "string" || typeof item.requester_name !== "string" || typeof item.email !== "string") || (page.next_page !== null && typeof page.next_page !== "string")) throw new Error("Global proposal records could not be verified.");
      if (generation === listGeneration.current) { setItems(previous => next ? [...previous, ...page.items] : page.items); setCursor(page.next_page); }
    } catch (cause) {
      if (generation === listGeneration.current) { if (!next) setItems([]); setCursor(null); setError(cause instanceof Error ? cause.message : "Unable to load the HQ proposal queue."); }
    } finally { if (generation === listGeneration.current) setLoading(false); }
  }

  useEffect(() => { if (session) void loadList(); }, [session]);

  async function open(application: Application, next?: string | null) {
    if (!session) return;
    const generation = ++threadGeneration.current;
    const switching = selected?.summary.id !== application.summary.id;
    setSelected(application); setThreadLoading(true); setError(""); setNotice("");
    if (!next && switching) { setMessages([]); setMessageCursor(null); }
    try {
      const thread = await connectedRequest<Thread>(`/v1/hq/applications/${segment(application.summary.id)}${next ? `?cursor=${segment(next)}` : ""}`, undefined, "GET", session.uid);
      if (thread.inquiry.id !== application.summary.id || !Array.isArray(thread.messages.items) || thread.messages.items.some(message => !Number.isSafeInteger(message.sequence) || typeof message.body !== "string") || (thread.messages.next_page !== null && typeof thread.messages.next_page !== "string")) throw new Error("The proposal conversation could not be verified.");
      if (generation !== threadGeneration.current) return;
      setMessages(previous => next ? [...thread.messages.items, ...previous] : thread.messages.items);
      setMessageCursor(thread.messages.next_page); setStatus(thread.inquiry.status);
      setSelected(previous => previous?.summary.id === application.summary.id
        ? { ...previous, summary: thread.inquiry }
        : { ...application, summary: thread.inquiry });
    } catch (cause) {
      if (generation === threadGeneration.current) { if (!next) setMessages([]); setMessageCursor(null); setError(cause instanceof Error ? cause.message : "Unable to load this proposal conversation."); }
    } finally { if (generation === threadGeneration.current) setThreadLoading(false); }
  }

  async function respond(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !selected || !reply.trim()) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const summary = await registrationCommand<Summary>(
        `/v1/hq/applications/${segment(selected.summary.id)}`,
        { expected_revision: selected.summary.revision, message: reply.trim(), status },
        "POST", false, session.uid,
      );
      setReply("");
      setSelected(previous => previous ? { ...previous, summary } : null);
      setItems(previous => previous.map(item => item.summary.id === summary.id ? { ...item, summary } : item));
      await open({ ...selected, summary });
      setNotice("Response and queue state were saved. No affiliation decision was recorded.");
    } catch (cause) {
      setError(cause instanceof ApiError && cause.status === 409
        ? "This proposal changed. Reload it before replying again."
        : cause instanceof ApiError && cause.status === 401
          ? "Global access could not be verified. Sign in again and retry."
          : cause instanceof Error ? cause.message : "Unable to save the HQ response.");
    } finally { setBusy(false); }
  }

  return <main id="main-content" className="workspace-main">
    <PageHeading eyebrow="Global HQ / Proposals" title="Chapter, studio & partner proposals" description="Review private intake conversations and request follow-up. This queue does not grant affiliation or approve a partnership." action={<Link href="/hq" className="button button-outline">HQ overview</Link>} />
    {!session && loading && <p role="status">Verifying Global HQ access…</p>}
    {!session && error && <p role="alert" className="form-error">{error}</p>}
    {session && <>
      <p className="fineprint">Queue status tracks communication only. Formal decision states, review rubric and retention policy await WSB approval.</p>
      {error && <p role="alert" className="form-error">{error}</p>}{notice && <p role="status">{notice}</p>}
      <div className="grid gap-5 xl:grid-cols-[minmax(17rem,0.8fr)_minmax(0,1.7fr)]">
        <section className="panel connected-stack" aria-labelledby="application-queue">
          <div className="panel-heading"><div><h2 id="application-queue">Received proposals</h2><p>Chapter scoped private conversations</p></div><button className="button button-outline" disabled={loading} onClick={() => void loadList()}>Refresh</button></div>
          {loading && <p role="status">Loading proposals…</p>}
          {!loading && items.length === 0 && !error && <p>No indexed proposals are available.</p>}
          <ul className="connected-list">{items.map(item => <li key={item.summary.id} className="connected-stack">
            <button className="text-left" onClick={() => void open(item)} aria-current={selected?.summary.id === item.summary.id ? "true" : undefined}>
              <strong>{item.summary.subject}</strong><p>{item.summary.category.replaceAll("_", " ")} · {item.summary.chapter_id.toUpperCase()}</p><p>{item.requester_name} · {item.email}</p><Status tone={item.summary.status === "resolved" ? "neutral" : "amber"}>{item.summary.status.replaceAll("_", " ")}</Status>
            </button>
          </li>)}</ul>
          {cursor && <button className="button button-outline" disabled={loading} onClick={() => void loadList(cursor)}>Load more</button>}
        </section>
        <section className="panel connected-stack" aria-labelledby="application-thread">
          {!selected ? <><h2 id="application-thread">Proposal conversation</h2><p>Select a proposal to read its messages.</p></> : <>
            <div><h2 id="application-thread">{selected.summary.subject}</h2><p>{selected.requester_name} · {selected.email}</p><p>Chapter {selected.summary.chapter_id.toUpperCase()} · {selected.summary.category.replaceAll("_", " ")} · revision {selected.summary.revision}</p></div>
            {threadLoading && messages.length === 0 && <p role="status">Loading conversation…</p>}
            <ol className="connected-list">{messages.map(row => <li key={row.sequence}><p><strong>{row.source.replaceAll("_", " ")}</strong> · {new Date(row.created_at * 1000).toLocaleString()}</p><p className="whitespace-pre-wrap break-words">{row.body}</p></li>)}</ol>
            {messageCursor && <button className="button button-outline" disabled={threadLoading} onClick={() => void open(selected, messageCursor)}>Load earlier messages</button>}
            <form className="connected-stack" onSubmit={respond}>
              <label htmlFor="hq-response">Reply or request more information<textarea id="hq-response" rows={5} maxLength={4000} required value={reply} onChange={event => setReply(event.target.value)} disabled={busy} /></label>
              <label htmlFor="hq-queue-status">Conversation state<select id="hq-queue-status" value={status} onChange={event => setStatus(event.target.value as InquiryStatus)} disabled={busy}>{statuses.map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label>
              <p className="fineprint">“Resolved” closes the conversation only. It does not accept or decline the proposal or create a WSB affiliation.</p>
              <button className="button button-volt" disabled={busy || !reply.trim()}>{busy ? "Saving response…" : "Send HQ response"}</button>
            </form>
          </>}
        </section>
      </div>
    </>}
  </main>;
}
