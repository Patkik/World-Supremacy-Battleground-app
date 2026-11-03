"use client";

import { use, useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status } from "@/components/ui";
import { useWorkspaceSession } from "@/lib/account";
import { connectedPage, connectedRequest, segment } from "@/lib/connected-api";
import { registrationCommand } from "@/lib/registration-command";

type Draft = {
  id: string;
  chapter_id: string;
  revision: number;
  title: string;
  body: string;
  updated_at: number;
  updated_by: string;
  status: "draft";
};
type Version = {
  draft_id: string;
  chapter_id: string;
  revision: number;
  title: string;
  body: string;
  saved_at: number;
  saved_by: string;
};
type Page<T> = { items: T[]; next_page: string | null };

function when(seconds: number) {
  const value = new Date(seconds * 1000);
  return Number.isFinite(value.getTime()) ? value.toLocaleString() : "Saved time unavailable";
}

export function ChapterContentDrafts({ params }: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = use(params);
  const { session, loading: sessionLoading, error: sessionError } = useWorkspaceSession(chapterId);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [selected, setSelected] = useState<Draft | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [versions, setVersions] = useState<Version[]>([]);
  const [versionCursor, setVersionCursor] = useState<string | null>(null);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const draftRequest = useRef(0);
  const versionRequest = useRef(0);
  const activeScope = useRef("");
  const activeDraft = useRef<string | null>(null);
  const allowed = !!session && session.chapter_id === chapterId && session.role === "chapter_director";
  const uid = session?.uid;
  const scope = `${chapterId}/${uid ?? ""}`;
  activeScope.current = scope;
  activeDraft.current = selected?.id ?? null;
  const base = `/v1/chapters/${segment(chapterId)}/content/drafts`;

  const loadDrafts = useCallback(async (next?: string | null) => {
    if (!uid || !allowed) return;
    const request = ++draftRequest.current;
    const requestScope = scope;
    setLoadingDrafts(true);
    setError("");
    try {
      const page = await connectedPage<Draft>(base, next, uid);
      if (request !== draftRequest.current || activeScope.current !== requestScope) return;
      setDrafts(current => next ? [...current, ...page.items] : page.items);
      setCursor(page.next_page);
    } catch (cause) {
      if (request === draftRequest.current && activeScope.current === requestScope) {
        setError(cause instanceof Error ? cause.message : "Unable to load private drafts.");
      }
    } finally {
      if (request === draftRequest.current && activeScope.current === requestScope) setLoadingDrafts(false);
    }
  }, [allowed, base, scope, uid]);

  useEffect(() => {
    draftRequest.current++;
    versionRequest.current++;
    setDrafts([]); setCursor(null); setSelected(null); setTitle(""); setBody("");
    setVersions([]); setVersionCursor(null); setLoadingDrafts(false); setLoadingVersions(false); setError(""); setNotice("");
    if (allowed) void loadDrafts();
    return () => { draftRequest.current++; versionRequest.current++; };
  }, [allowed, chapterId, loadDrafts, uid]);

  function startNew() {
    versionRequest.current++;
    setLoadingVersions(false);
    setSelected(null);
    setTitle("");
    setBody("");
    setVersions([]);
    setVersionCursor(null);
    setError("");
    setNotice("");
  }

  function openDraft(draft: Draft) {
    versionRequest.current++;
    setLoadingVersions(false);
    setSelected(draft);
    setTitle(draft.title);
    setBody(draft.body);
    setVersions([]);
    setVersionCursor(null);
    setError("");
    setNotice("");
  }

  async function loadVersions(next?: string | null) {
    if (!uid || !selected) return;
    const request = ++versionRequest.current;
    const requestScope = scope;
    const draftId = selected.id;
    setLoadingVersions(true);
    setError("");
    try {
      const path = `${base}/${segment(selected.id)}/versions`;
      const page = await connectedPage<Version>(path, next, uid);
      if (request !== versionRequest.current || activeScope.current !== requestScope || activeDraft.current !== draftId) return;
      setVersions(current => next ? [...current, ...page.items] : page.items);
      setVersionCursor(page.next_page);
    } catch (cause) {
      if (request === versionRequest.current && activeScope.current === requestScope && activeDraft.current === draftId) {
        setError(cause instanceof Error ? cause.message : "Unable to load revision history.");
      }
    } finally {
      if (request === versionRequest.current && activeScope.current === requestScope) setLoadingVersions(false);
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!uid || !allowed) return;
    if (!navigator.onLine) {
      setError("You’re offline. Reconnect before saving this private draft.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    const path = selected ? `${base}/${segment(selected.id)}` : base;
    const method = selected ? "PUT" : "POST";
    const saveScope = scope;
    try {
      const saved = await registrationCommand<Draft>(path, {
        draft_id: selected?.id,
        expected_revision: selected?.revision ?? 0,
        title,
        body,
      }, method, false, uid);
      if (activeScope.current !== saveScope) return;
      setSelected(saved);
      setTitle(saved.title);
      setBody(saved.body);
      setDrafts(current => [saved, ...current.filter(item => item.id !== saved.id)]);
      setNotice(`Saved private revision ${saved.revision}.`);
    } catch (cause) {
      if (activeScope.current !== saveScope) return;
      setError(cause instanceof Error ? cause.message : "Unable to save this draft.");
      if (typeof cause === "object" && cause !== null && "status" in cause && cause.status === 409) {
        setNotice("Another save changed this draft. Refresh the draft list, reopen it, and bring your edits across manually.");
      }
    } finally {
      setSaving(false);
    }
  }

  return <main id="main-content" className="workspace-main">
    <PageHeading
      eyebrow={`Chapter ${chapterId.toUpperCase()} / private workspace`}
      title="Content drafts"
      description="Prepare plain text announcements and stories for chapter review. Drafts are private and are not published."
      action={<Link href={`/admin/${segment(chapterId)}`} className="button button-outline">Chapter workspace <Arrow /></Link>}
    />
    <section className="panel border-l-2 border-l-[var(--accent-gold)]" aria-label="Publication gate">
      <div className="panel-heading"><div><h2>Private drafts only</h2><p>Publishing stays closed until chapter authority, content rights, audience, and correction rules are approved.</p></div><Status tone="amber">Not published</Status></div>
    </section>

    {sessionLoading ? <p role="status">Checking chapter access…</p>
      : !session ? <p role="alert" className="form-error">{sessionError || "Sign in with your chapter account to continue."}</p>
        : !allowed ? <p role="alert" className="form-error">Only the active chapter director can manage private content drafts for this chapter.</p>
          : <div className="grid gap-4 xl:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1.7fr)]">
            <section className="panel" aria-labelledby="draft-list-heading">
              <div className="panel-heading"><div><h2 id="draft-list-heading">Saved drafts</h2><p>{drafts.length} loaded · revisions are retained as private history.</p></div><Status tone="neutral">{loadingDrafts ? "Loading" : "Private"}</Status></div>
              <div className="connected-actions">
                <button type="button" className="button button-volt" onClick={startNew}>New draft</button>
                <button type="button" className="button button-outline" disabled={loadingDrafts} onClick={() => void loadDrafts()}>Refresh</button>
              </div>
              {loadingDrafts && <p role="status">Loading chapter drafts…</p>}
              {!loadingDrafts && drafts.length === 0 && <p className="fineprint">No saved drafts yet. Start one when you’re ready to prepare text for review.</p>}
              <ul className="connected-list" aria-label="Private chapter drafts">
                {drafts.map(draft => <li key={draft.id}>
                  <button type="button" className="w-full text-left" aria-current={selected?.id === draft.id ? "true" : undefined} onClick={() => openDraft(draft)}>
                    <strong className="block">{draft.title}</strong>
                    <span className="fineprint">Revision {draft.revision} · {when(draft.updated_at)}</span>
                  </button>
                </li>)}
              </ul>
              {cursor && <button type="button" className="button button-outline mt-3" disabled={loadingDrafts} onClick={() => void loadDrafts(cursor)}>Load more drafts</button>}
            </section>

            <div className="space-y-4">
              <form className="panel space-y-4" onSubmit={save}>
                <div className="panel-heading"><div><h2>{selected ? "Edit private draft" : "New private draft"}</h2><p>{selected ? `Current revision ${selected.revision} · saved ${when(selected.updated_at)}` : "Text is saved as a new revision each time."}</p></div><Status>{selected ? `v${selected.revision}` : "New"}</Status></div>
                <label className="form-field"><span>Title</span><input className="input" value={title} maxLength={160} required disabled={saving} onChange={event => setTitle(event.target.value)} /></label>
                <label className="form-field"><span>Draft text</span><textarea className="input min-h-64" value={body} required disabled={saving} onChange={event => setBody(Array.from(event.target.value).slice(0, 20000).join(""))} /><span className="fineprint">Plain text only · {Array.from(body).length.toLocaleString()} / 20,000 characters</span></label>
                <div className="connected-actions">
                  <button className="button button-volt" type="submit" disabled={saving || !title.trim() || !body.trim()}>{saving ? "Saving…" : "Save private revision"}</button>
                  {selected && <button className="button button-outline" type="button" disabled={loadingVersions} onClick={() => void loadVersions()}>{loadingVersions ? "Loading history…" : "View revision history"}</button>}
                </div>
                {notice && <p role="status" className="fineprint">{notice}</p>}
                {error && <p role="alert" className="form-error">{error}</p>}
              </form>

              {selected && versions.length > 0 && <section className="panel" aria-labelledby="revision-history-heading">
                <div className="panel-heading"><div><h2 id="revision-history-heading">Revision rail</h2><p>Choose an earlier version to continue editing; saving creates a new revision.</p></div><Status tone="neutral">{versions.length} loaded</Status></div>
                <ol className="connected-list">
                  {versions.map(version => <li key={version.revision} className="flex flex-wrap items-center justify-between gap-3">
                    <div><strong>Revision {version.revision}: {version.title}</strong><p className="fineprint">{when(version.saved_at)} · {version.saved_by}</p></div>
                    <button type="button" className="button button-outline" disabled={saving} onClick={() => { setTitle(version.title); setBody(version.body); setNotice(`Revision ${version.revision} loaded into the editor. Save to create a new revision.`); }}>Use text</button>
                  </li>)}
                </ol>
                {versionCursor && <button type="button" className="button button-outline mt-3" disabled={loadingVersions} onClick={() => void loadVersions(versionCursor)}>Load older revisions</button>}
              </section>}
            </div>
          </div>}
  </main>;
}
