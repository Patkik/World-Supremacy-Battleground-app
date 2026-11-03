"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useWorkspaceSession } from "@/lib/account";
import { connectedRequest, segment } from "@/lib/connected-api";
import { registrationCommand } from "@/lib/registration-command";
import { PageHeading } from "./ui";

type Draft = { revision: number; title: string; language: string; text: string; source: string; status: "draft"; rules_version: string };
function History({ path, uid, maximum }: { path: string; uid: string; maximum: number }) {
  const [revision, setRevision] = useState("1"); const [value, setValue] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function read(event: FormEvent) {
    event.preventDefault(); setValue(null); setError("");
    const number = Number(revision);
    if (!Number.isSafeInteger(number) || number < 1 || number > maximum) { setError("Choose an available draft version."); return; }
    setBusy(true);
    try { setValue(await connectedRequest<Draft>(`${path}/versions/${number}`, undefined, "GET", uid)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "This draft version could not be loaded."); }
    finally { setBusy(false); }
  }
  return <section className="panel"><h2>Previous draft versions</h2><form onSubmit={read}><label htmlFor="waiver-version">Draft version (1–{maximum})</label><input id="waiver-version" type="number" min={1} max={maximum} step={1} required value={revision} disabled={busy} onChange={event => { setRevision(event.target.value); setValue(null); }} /><button className="button button-outline" disabled={busy} type="submit">{busy ? "Loading version…" : "Read saved version"}</button></form>{error && <p role="alert" className="form-error">{error}</p>}{value && <article><h3>{value.title} · Version {value.revision}</h3><p>Draft · {value.language} · Rules {value.rules_version}</p><p>Source: {value.source}</p><div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{value.text}</div></article>}</section>;
}
function Editor({ chapter, event, uid, canEdit }: { chapter: string; event: string; uid: string; canEdit: boolean }) {
  const path = `/v1/chapters/${segment(chapter)}/events/${segment(event)}/waiver-draft`;
  const [draft, setDraft] = useState<Draft | null>(null);
  const [title, setTitle] = useState(""); const [language, setLanguage] = useState(""); const [text, setText] = useState(""); const [source, setSource] = useState("");
  const [ready, setReady] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  useEffect(() => {
    let alive = true;
    connectedRequest<Draft | null>(path, undefined, "GET", uid).then(value => {
      if (!alive) return;
      setDraft(value); setTitle(value?.title ?? ""); setLanguage(value?.language ?? ""); setText(value?.text ?? ""); setSource(value?.source ?? ""); setReady(true);
    }).catch(reason => { if (alive) setError(reason instanceof Error ? reason.message : "Draft could not be loaded."); });
    return () => { alive = false; };
  }, [path, uid]);
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const value = await registrationCommand<Draft>(path, { expected_revision: draft?.revision ?? 0, title, language, text, source }, "POST", false, uid);
      setDraft(value); setMessage(`Draft version ${value.revision} saved. It is not published or available for signature.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Draft could not be saved."); }
    finally { setBusy(false); }
  }
  return <section className="panel"><h2>Event waiver draft</h2><p>This local draft is for staff preparation. It does not record consent or change entry readiness.</p>{error && <p role="alert" className="form-error">{error}</p>}{message && <p role="status">{message}</p>}{!ready && !error && <p role="status">Loading draft…</p>}{ready && <><p>{draft ? `Draft version ${draft.revision} · Rules reference ${draft.rules_version}` : "No draft has been saved for this event."}</p><form className="connected-stack" onSubmit={save}><label htmlFor="waiver-title">Document title</label><input id="waiver-title" value={title} maxLength={200} required disabled={!canEdit || busy} onChange={e => setTitle(e.target.value)} /><label htmlFor="waiver-language">Language reference</label><input id="waiver-language" value={language} maxLength={35} pattern="[A-Za-z0-9-]+" placeholder="en-PH" required disabled={!canEdit || busy} onChange={e => setLanguage(e.target.value)} /><label htmlFor="waiver-text">Draft document text</label><textarea id="waiver-text" rows={16} value={text} required disabled={!canEdit || busy} onChange={e => setText(e.target.value)} /><label htmlFor="waiver-source">Source and policy reference</label><input id="waiver-source" value={source} maxLength={500} required disabled={!canEdit || busy} onChange={e => setSource(e.target.value)} />{canEdit && <button className="button button-volt" type="submit" disabled={busy}>{busy ? "Saving draft…" : "Save draft version"}</button>}</form>{draft && <History path={path} uid={uid} maximum={draft.revision} />}</>}</section>;
}

export function WaiverDraft({ chapter, event }: { chapter: string; event: string }) {
  const { session, loading, error } = useWorkspaceSession();
  return <main id="main-content" className="workspace-main"><PageHeading title="Waiver preparation" description="Prepare versioned event documents for policy review." />{loading ? <p role="status">Checking chapter access…</p> : !session ? <p>{error || "Sign in to continue."}</p> : session.chapter_id !== chapter || !["chapter_director", "registrar"].includes(session.role) ? <p>Your account does not have access to this event workspace.</p> : <Editor key={`${session.uid}:${chapter}:${event}`} chapter={chapter} event={event} uid={session.uid} canEdit={session.role === "chapter_director"} />}</main>;
}
