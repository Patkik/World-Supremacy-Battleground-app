"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { selectChapterFor, useWorkspaceSession, type WorkspaceSession } from "@/lib/account";
import { accountChapterPage, globalHqSession, type AccountChapter } from "@/lib/api";
import { ApiError, connectedPage, segment } from "@/lib/connected-api";
import { firebaseClient } from "@/lib/firebase/client";
import { Brand } from "./ui";

const dutyRoles = ["chapter_director", "registrar", "head_judge", "judge", "marshal", "audio_operator"];
type DutyEvent = { id: string; chapter_id: string; name: string; status: string };

function nextActions(session: WorkspaceSession, eventId: string) {
  const event = segment(eventId);
  const chapter = segment(session.chapter_id);
  switch (session.role) {
    case "chapter_director": return [{ label: "Open event operations", href: `/admin/${chapter}/events/${event}` }];
    case "registrar": return [{ label: "Review registrations", href: `/admin/${chapter}/events/${event}/registrations` }];
    case "head_judge": return [{ label: "Review judging status", href: `/console/${event}/head-judge` }];
    case "judge": return [{ label: "Open assigned scorecards", href: `/console/${event}/judge` }];
    case "marshal": return [
      { label: "Open check-in desk", href: `/console/${event}/check-in` },
      { label: "Open stage queue", href: `/console/${event}/marshal` },
    ];
    case "audio_operator": return [{ label: "Open audio desk", href: `/console/${event}/audio` }];
    default: return [];
  }
}

function AssignedEventWorkspace({ session }: { session: WorkspaceSession }) {
  const [events, setEvents] = useState<DutyEvent[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const load = useCallback(async (next?: string | null) => {
    const current = ++generation.current;
    setLoading(true);
    setError("");
    try {
      const page = await connectedPage<DutyEvent>(`/v1/chapters/${segment(session.chapter_id)}/staff/duty-events`, next, session.uid);
      const ids = new Set<string>();
      if (!Array.isArray(page.items) || page.items.length > 100 || page.items.some(item => {
        if (!item || item.chapter_id !== session.chapter_id || typeof item.id !== "string" || !item.id || item.id.length > 200 ||
          typeof item.name !== "string" || !item.name || item.name.length > 240 ||
          typeof item.status !== "string" || item.status.length > 80 || ids.has(item.id)) return true;
        ids.add(item.id);
        return false;
      }) || !(page.next_page === null || (typeof page.next_page === "string" && page.next_page.length > 0 && page.next_page.length <= 4096 && page.next_page !== next))) {
        throw new Error("Assigned event details could not be verified.");
      }
      if (current === generation.current) {
        setEvents(previous => next ? [...previous, ...page.items.filter(item => !previous.some(value => value.id === item.id))] : page.items);
        setCursor(page.next_page);
      }
    } catch (cause) {
      if (current === generation.current) {
        if (cause instanceof ApiError && [401, 403].includes(cause.status)) {
          setEvents([]);
          setCursor(null);
        }
        setError(cause instanceof Error ? cause.message : "Assigned events could not be loaded.");
      }
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, [session.chapter_id, session.uid]);
  useEffect(() => {
    setEvents([]);
    setCursor(null);
    setError("");
    void load();
    return () => { generation.current++; };
  }, [load]);

  return <section className="connected-stack" aria-labelledby="assigned-event-workspace-heading">
    <div className="connected-actions">
      <div><h2 id="assigned-event-workspace-heading">Assigned event workspaces</h2><p>Current server-verified event access for your chapter role.</p></div>
      <button type="button" className="button button-outline" disabled={loading} onClick={() => void load()}>{loading ? "Refreshing…" : "Refresh events"}</button>
    </div>
    {loading && events.length === 0 && <p role="status">Loading assigned events…</p>}
    {error && <p role="alert" className="form-error">{error} Refresh the list or open your current workspace.</p>}
    {!loading && !error && events.length === 0 && !cursor && <p>No assigned events are available for this chapter role.</p>}
    {events.length > 0 && <ul className="connected-list">{events.map(event => <li key={event.id} className="flex flex-wrap items-center justify-between gap-3">
      <div><strong>{event.name}</strong><p>{event.id} · {event.status}</p><p className="fineprint">Suggested next step for your role</p></div>
      <div className="connected-actions">{nextActions(session, event.id).map(action => <Link key={action.href} className="button button-outline" href={action.href}>{action.label}</Link>)}</div>
    </li>)}</ul>}
    {cursor && <button type="button" className="button button-outline" disabled={loading} onClick={() => void load(cursor)}>{loading ? "Loading…" : "Load more events"}</button>}
    <p className="fineprint">Opening a task checks your current membership and event assignment again.</p>
  </section>;
}

function workspacePath(role: string, chapterId: string) {
  if (role === "support") return `/admin/${encodeURIComponent(chapterId)}/support`;
  if (["judge", "head_judge", "marshal", "audio_operator"].includes(role)) return "/console";
  if (["chapter_director", "registrar", "finance", "verifier", "auditor"].includes(role)) return `/admin/${encodeURIComponent(chapterId)}`;
  if (role === "guardian") return "/app/dependents";
  return "/app/crews";
}

export function WorkspaceAccess() {
  const router = useRouter();
  const { user, session, loading } = useWorkspaceSession();
  const [chapters, setChapters] = useState<AccountChapter[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [chaptersError, setChaptersError] = useState("");
  const chaptersGeneration = useRef(0);
  const [hqUid, setHqUid] = useState<string | null>(null);
  useEffect(() => {
    let current = true;
    setHqUid(null);
    if (user) void globalHqSession().then(result => {
      if (current && result.uid === user.uid) setHqUid(result.uid);
    }).catch(() => { /* Chapter accounts do not require global membership. */ });
    return () => { current = false; };
  }, [user]);
  const [returnTo, setReturnTo] = useState<{ path: string; chapterId: string } | null>(null);
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.getAll("returnTo").length !== 1) return;
    const candidate = query.get("returnTo");
    if (!candidate || candidate.length > 512 || !candidate.startsWith("/console?")) return;
    try {
      const url = new URL(candidate, window.location.origin);
      if (url.origin !== window.location.origin || url.pathname !== "/console") return;
      const chapterId = url.searchParams.get("chapter");
      const eventId = url.searchParams.get("event");
      if (url.searchParams.size !== 2 || url.searchParams.getAll("chapter").length !== 1 || url.searchParams.getAll("event").length !== 1 || !chapterId || chapterId.length > 200 || chapterId.includes("/") || chapterId === "." || chapterId === ".." || !eventId || eventId.length > 200 || eventId.includes("/") || eventId === "." || eventId === "..") return;
      setReturnTo({ path: `${url.pathname}${url.search}`, chapterId });
    } catch { /* An invalid return target falls back to the selected workspace. */ }
  }, []);
  const loadChapters = useCallback(async (next?: string | null) => {
    if (!user) return;
    const generation = ++chaptersGeneration.current;
    const expectedUid = user.uid;
    setChaptersLoading(true); setChaptersError("");
    try {
      const page = await accountChapterPage(next, expectedUid);
      if (generation !== chaptersGeneration.current) return;
      setChapters(previous => {
        const base = next ? previous : [];
        const byChapter = new Map(base.map(value => [value.chapter_id, value]));
        for (const item of page.items) byChapter.set(item.chapter_id, item);
        return [...byChapter.values()];
      });
      setCursor(page.next_page);
    } catch (cause) {
      if (generation === chaptersGeneration.current) setChaptersError(cause instanceof Error ? cause.message : "Chapter memberships could not be loaded.");
    } finally { if (generation === chaptersGeneration.current) setChaptersLoading(false); }
  }, [user]);
  useEffect(() => {
    ++chaptersGeneration.current;
    setChapters([]); setCursor(null); setChaptersError(""); setChaptersLoading(false);
    if (user) void loadChapters();
    return () => { ++chaptersGeneration.current; };
  }, [user, loadChapters]);

  const path = session ? workspacePath(session.role, session.chapter_id) : "";
  function openChapter(chapter: AccountChapter) {
    if (!user) return;
    selectChapterFor(user.uid, chapter.chapter_id);
    router.push(returnTo?.chapterId === chapter.chapter_id ? returnTo.path : workspacePath(chapter.role, chapter.chapter_id));
  }
  return <main id="main-content" className="system-page"><Brand /><div className="account-form"><h1>Your workspace</h1>
    {!user ? loading ? <p role="status">Checking your signed-in account…</p> : <Link className="button button-volt" href="/sign-in">Sign in to continue</Link> : <>
      {hqUid === user.uid && <section className="connected-stack"><h2>Global HQ</h2><p>Your current platform membership is verified separately from chapter access.</p><Link className="button button-volt" href="/hq">Open Global HQ</Link></section>}
      {session && <><p>Current chapter: <strong>{session.chapter_id.toUpperCase()}</strong></p><p>Assigned role: {session.role.replaceAll("_", " ")}</p><Link className="button button-volt" href={path}>Open current workspace</Link>
        {dutyRoles.includes(session.role) && <AssignedEventWorkspace key={`${session.uid}/${session.chapter_id}/${session.role}`} session={session} />}
      </>}
      <section className="connected-stack" aria-labelledby="chapter-memberships-heading">
        <h2 id="chapter-memberships-heading">Your chapter memberships</h2>
        <p>Choose a chapter to set your workspace context. The server checks current access each time you open a workspace.</p>
        {chaptersLoading && chapters.length === 0 && <p role="status">Loading current memberships…</p>}
        {chaptersError && <p role="alert" className="form-error">{chaptersError}</p>}
        {!chaptersLoading && !chaptersError && chapters.length === 0 && !cursor && <p>No active chapter memberships were found for this account.</p>}
        {returnTo && <p role="status">Choose chapter {returnTo.chapterId.toUpperCase()} to continue to the assigned event.</p>}
        {chapters.length > 0 && <ul className="connected-list">{chapters.map(chapter => <li key={chapter.chapter_id} className="flex flex-wrap items-center justify-between gap-3">
          <div><strong>{chapter.chapter_name}</strong><p>{chapter.chapter_id.toUpperCase()} · {chapter.role.replaceAll("_", " ")}</p></div>
          <button type="button" className="button button-outline" disabled={chaptersLoading} onClick={() => openChapter(chapter)}>Open this workspace</button>
        </li>)}</ul>}
        {cursor && <button type="button" className="button button-outline" disabled={chaptersLoading} onClick={() => void loadChapters(cursor)}>{chaptersLoading ? "Loading…" : "Load more chapters"}</button>}
      </section>
    </>}
    {user && <button className="button button-outline" onClick={() => signOut(firebaseClient().auth)}>Sign out</button>}
    {process.env.NEXT_PUBLIC_WSB_LOCAL_TESTING === "true" && session?.chapter_id === "ph" && <section className="connected-stack"><h2>Local rehearsal</h2><p className="fineprint">Use synthetic data in this test environment.</p>{session.role === "crew_manager" && <><Link href="/app/crews">Your crews</Link><Link href="/app/register/local-rehearsal">Register a crew</Link><Link href="/app/entries/local-entry-draft/checkout?event=local-rehearsal">Test payment reference</Link></>}{["judge", "head_judge"].includes(session.role) && <Link href="/console/local-rehearsal/judge">Assigned performances</Link>}{["registrar","chapter_director"].includes(session.role)&&<Link href="/admin/ph/events/local-rehearsal/registrations">Event registrations</Link>}{["finance", "chapter_director"].includes(session.role) && <Link href="/admin/ph/finance/transactions">Payment reconciliation</Link>}</section>}
  </div></main>;
}
