"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useWorkspaceSession, type WorkspaceSession } from "@/lib/account";
import { Arrow, Brand, PageHeading } from "@/components/ui";
import { ApiError, connectedPage, connectedRequest, segment } from "@/lib/connected-api";

const duties = [
  { title: "Judge", desc: "Criteria scoring for your assigned entries, with offline drafts and reconnect delivery.", slug: "judge", roles: ["judge", "head_judge"] },
  { title: "Head judge", desc: "Division review, technical deductions and the division lock barrier.", slug: "head-judge", roles: ["head_judge", "chapter_director"] },
  { title: "Stage marshal", desc: "Stage queue, holds, lineup drafts and entry positions.", slug: "marshal", roles: ["marshal", "chapter_director"] },
  { title: "Check-in desk", desc: "Online arrival records by entry and dancer account ID. QR passes and offline scanning are not available.", slug: "check-in", roles: ["marshal", "chapter_director"] },
  { title: "Battle desk", desc: "Configured matches and judge ballots for the battle format.", slug: "battles", roles: ["judge", "head_judge", "chapter_director"] },
  { title: "Audio operator", desc: "Assigned-event music export where the local demo export is enabled.", slug: "audio", roles: ["audio_operator", "chapter_director"] },
  { title: "Public display", desc: "The director-controlled public stage projection for this event.", slug: "broadcast", roles: ["judge", "head_judge", "marshal", "registrar", "audio_operator", "chapter_director"] },
  { title: "Device sync", desc: "This device's offline score outbox and delivery state.", slug: "sync", roles: ["judge", "head_judge"] },
];

type DutyEvent = { id: string; chapter_id: string; name: string; status: string };
export default function ConsoleDutySelectionPage() {
  const { session, loading } = useWorkspaceSession();
  return <DutySelector key={JSON.stringify([session?.uid ?? null, session?.chapter_id ?? null, session?.role ?? null, loading])} session={session} sessionLoading={loading} />;
}

function DutySelector({ session, sessionLoading }: { session: WorkspaceSession | null; sessionLoading: boolean }) {
  const [event, setEvent] = useState("");
  const [returnPath, setReturnPath] = useState("/console");
  const workspaceHref = `/workspaces?returnTo=${encodeURIComponent(returnPath)}`;
  const [verifiedEvent, setVerifiedEvent] = useState("");
  const [checkingEvent, setCheckingEvent] = useState(false);
  const [accessError, setAccessError] = useState("");
  const accessGeneration = useRef(0);
  const [events, setEvents] = useState<DutyEvent[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const load = useCallback(async (next?: string | null) => {
    if (!session) return;
    const current = ++generation.current; setLoadingEvents(true); setError("");
    try {
      const page = await connectedPage<DutyEvent>(`/v1/chapters/${segment(session.chapter_id)}/staff/duty-events`, next, session.uid);
      if (!Array.isArray(page.items) || page.items.length > 100 || page.items.some(row => !row || row.chapter_id !== session.chapter_id || typeof row.id !== "string" || !row.id || row.id.length > 200 || typeof row.name !== "string" || !row.name || row.name.length > 240 || typeof row.status !== "string" || row.status.length > 80) || new Set(page.items.map(row => row.id)).size !== page.items.length || !(page.next_page === null || (typeof page.next_page === "string" && page.next_page.length > 0 && page.next_page.length <= 4096 && page.next_page !== next))) throw new Error("Assigned events could not be verified.");
      if (current === generation.current) { setEvents(previous => next ? [...previous, ...page.items.filter(row => !previous.some(item => item.id === row.id))] : page.items); setCursor(page.next_page); }
    } catch (cause) {
      if (current === generation.current) {
        if (cause instanceof ApiError && [401, 403].includes(cause.status)) {
          accessGeneration.current++;
          setEvents([]); setCursor(null); setEvent(""); setVerifiedEvent(""); setCheckingEvent(false);
        }
        setError(cause instanceof Error ? cause.message : "Unable to load assigned events.");
      }
    } finally { if (current === generation.current) setLoadingEvents(false); }
  }, [session]);
  useEffect(() => { if (!sessionLoading && session) void load(); return () => { generation.current++; accessGeneration.current++; }; }, [load, session, sessionLoading]);
  const reference = event.trim();

  const verifyEvent = useCallback(async (candidate: string) => {
    const id = candidate.trim();
    const current = ++accessGeneration.current;
    setVerifiedEvent(""); setAccessError("");
    if (!session) { setAccessError("Sign in and select a chapter before checking event access."); return; }
    if (!id || id.length > 200 || id.includes("/") || id === "." || id === "..") { setAccessError("Enter a valid event reference."); return; }
    setCheckingEvent(true);
    try {
      const result = await connectedRequest<DutyEvent>(`/v1/chapters/${segment(session.chapter_id)}/events/${segment(id)}/duty-access`, undefined, "GET", session.uid);
      if (!result || result.id !== id || result.chapter_id !== session.chapter_id || typeof result.name !== "string" || !result.name || typeof result.status !== "string") throw new Error("Event access response could not be verified.");
      if (current === accessGeneration.current) setVerifiedEvent(id);
    } catch (cause) {
      if (current === accessGeneration.current) setAccessError(cause instanceof ApiError && [403, 404].includes(cause.status) ? "This event is unavailable for your current assignment. Refresh the list or contact your director." : cause instanceof Error ? cause.message : "Unable to check event access.");
    } finally { if (current === accessGeneration.current) setCheckingEvent(false); }
  }, [session]);
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const event = query.get("event"), chapter = query.get("chapter");
    if (query.size === 2 && query.getAll("event").length === 1 && query.getAll("chapter").length === 1 && event && event.length <= 200 && !event.includes("/") && event !== "." && event !== ".." && chapter && chapter.length <= 200 && !chapter.includes("/") && chapter !== "." && chapter !== "..") {
      setReturnPath(`/console?${new URLSearchParams({ chapter, event }).toString()}`);
    }
  }, []);
  useEffect(() => {
    if (!session || sessionLoading) return;
    const query = new URLSearchParams(window.location.search);
    const requestedEvent = query.get("event");
    const requestedChapter = query.get("chapter");
    if (!requestedEvent) return;
    if (query.size !== 2 || query.getAll("event").length !== 1 || query.getAll("chapter").length !== 1) {
      setAccessError("The event link has extra or repeated details. Enter the event reference to check access.");
      return;
    }
    if (requestedChapter && requestedChapter !== session.chapter_id) {
      setAccessError("This assignment belongs to another chapter. Choose that chapter workspace before continuing.");
      return;
    }
    setEvent(requestedEvent);
    void verifyEvent(requestedEvent);
  }, [session, sessionLoading, verifyEvent]);
  function open(eventObject: FormEvent) { eventObject.preventDefault(); void verifyEvent(reference); }

  return (
    <main className="min-h-screen p-6 md:p-12 bg-obsidian max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8 pb-4 border-b border-subtle">
        <Brand />
        <Link href="/app" className="button button-outline text-xs">
          ← Exit to Crew Portal
        </Link>
      </div>

      <PageHeading
        eyebrow="Tactical event console"
        title="Operational duty selection"
        description="Choose an assigned event or enter its reference, then open your duty console. Each destination rechecks current access."
      />

      <section className="panel p-6 mt-8 space-y-3" aria-label="Assigned events">
        <h2>Assigned events</h2>
        {sessionLoading ? <p role="status">Checking chapter access…</p> : !session ? <p>Sign in and select a chapter to load assigned events. <Link href={`/sign-in?next=${segment(returnPath)}`} className="text-link">Sign in</Link> or <Link href={workspaceHref} className="text-link">choose a chapter</Link>.</p> : <>
          {events.map(item => <button type="button" key={item.id} className="button button-outline" disabled={loadingEvents} onClick={() => { setEvent(item.id); void verifyEvent(item.id); }} aria-pressed={reference === item.id && verifiedEvent === item.id}>{item.name} · {item.id}</button>)}
          {!events.length && !loadingEvents && !error && <p>{cursor ? "No assigned events in these pages. More pages are available." : "No assigned events found in the loaded pages."}</p>}
          {loadingEvents && <p role="status">Loading assigned events…</p>}{error && <p className="form-error" role="alert">{error}</p>}
          {cursor && <button type="button" className="button button-outline" disabled={loadingEvents} onClick={() => void load(cursor)}>Load more events</button>}
          <button type="button" className="button button-outline" disabled={loadingEvents} onClick={() => void load()}>Refresh events</button>
        </>}
        <p className="fineprint">This list can change. Opening a console checks current membership and assignment again.</p>
      </section>

      <form onSubmit={open} className="panel p-6 mt-8 space-y-3" aria-label="Event reference">
        <label htmlFor="console-event" className="block text-sm font-semibold text-chrome">Event reference</label>
        <input
          id="console-event"
          value={event}
          onChange={change => { accessGeneration.current++; setEvent(change.target.value); setVerifiedEvent(""); setCheckingEvent(false); setAccessError(""); }}
          required
          maxLength={200}
          placeholder="For example, the event reference in your assignment notice"
          className="w-full p-3 rounded bg-tungsten border border-subtle text-chrome focus:border-volt"
        />
        <button type="submit" className="button button-outline" disabled={checkingEvent || !session}>{checkingEvent ? "Checking event access…" : "Check event access"}</button>
        {accessError && <p className="form-error" role="alert">{accessError} <Link href={workspaceHref} className="text-link">Choose a chapter</Link></p>}
        {verifiedEvent === reference && !!reference && <p role="status">Event access checked. Choose a duty below.</p>}
        <p className="text-xs text-titanium">You can also enter the reference from an assignment notice.</p>
      </form>

      {session && <p className="fineprint">Duties shown for your current chapter role: {session.role.replaceAll("_", " ")}. Each desk checks its event and specific assignment. Device sync can open local records before an event check; sending still requires server authorization.</p>}
      {!session && !sessionLoading && <p className="fineprint">Sign in and select a chapter to see the duties available for your role.</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {duties.filter(duty => session && duty.roles.includes(session.role)).map((duty) => (
          reference && (duty.slug === "sync" || (verifiedEvent === reference && !checkingEvent))
            ? <Link key={duty.title} href={`/console/${segment(reference)}/${duty.slug}`} className="panel p-6 hover:border-volt transition-colors block group">
              <h2 className="text-xl font-bold text-chrome group-hover:text-volt transition-colors mb-2">{duty.title}</h2>
              <p className="text-xs text-titanium leading-relaxed mb-4">{duty.desc}</p>
              <span className="text-xs text-volt font-bold flex items-center gap-1">Open console <Arrow /></span>
            </Link>
            : <div key={duty.title} className="panel p-6 opacity-60" aria-disabled="true">
              <h2 className="text-xl font-bold text-chrome mb-2">{duty.title}</h2>
              <p className="text-xs text-titanium leading-relaxed">{duty.desc}</p>
            </div>
        ))}
      </div>
    </main>
  );
}
