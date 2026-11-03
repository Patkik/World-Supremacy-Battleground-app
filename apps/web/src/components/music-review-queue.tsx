"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useWorkspaceSession, type WorkspaceSession } from "@/lib/account";
import { ApiError, connectedPage, segment } from "@/lib/connected-api";
import { PageHeading, Status } from "@/components/ui";
import { MusicReview } from "@/components/music-review";

type QueueItem = {
  entry_id: string;
  version: number;
  duration_ms: number;
  submitted_at: number;
};

export function MusicReviewQueue({ chapterId, eventId }: { chapterId: string; eventId: string }) {
  const { session, loading: sessionLoading, error: sessionError } = useWorkspaceSession(chapterId);
  if (!session) return <main id="main-content" className="workspace-main"><PageHeading eyebrow="Event operations / audio" title="Music review queue" description="Review submitted tracks. Decisions do not establish compliance or change entry readiness." />{sessionLoading ? <p role="status">Checking chapter and event access…</p> : <p role="alert" className="form-error">{sessionError || "Sign in with your chapter account to continue."}</p>}</main>;
  return <MusicReviewQueueWorkspace key={`${session.uid}:${chapterId}:${eventId}`} chapterId={chapterId} eventId={eventId} session={session} />;
}

function MusicReviewQueueWorkspace({ chapterId, eventId, session }: { chapterId: string; eventId: string; session: WorkspaceSession }) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const endpoint = `/v1/chapters/${segment(chapterId)}/events/${segment(eventId)}/music-queue`;
  const authorized = session.chapter_id === chapterId
    && ["registrar", "chapter_director"].includes(session.role);

  const load = useCallback(async (next?: string | null) => {
    if (!authorized) return;
    const current = ++generation.current;
    setLoading(true);
    setError("");
    try {
      const page = await connectedPage<QueueItem>(endpoint, next, session.uid);
      if (!Array.isArray(page.items) || page.items.some(item => typeof item.entry_id !== "string" || !item.entry_id || !Number.isSafeInteger(item.version) || item.version < 1 || !Number.isSafeInteger(item.duration_ms) || item.duration_ms < 0 || !Number.isSafeInteger(item.submitted_at) || item.submitted_at < 1) || (page.next_page !== null && typeof page.next_page !== "string")) throw new Error("Music review queue could not be verified for this event.");
      if (current === generation.current) {
        setItems(previous => next ? [...previous, ...page.items] : page.items);
        setCursor(page.next_page);
        if (!next) setSelected(selected => page.items.some(item => item.entry_id === selected) ? selected : "");
      }
    } catch (cause) {
      if (current === generation.current) {
        if (!next || (cause instanceof ApiError && [401, 403].includes(cause.status))) setItems([]);
        if (cause instanceof ApiError && [401, 403].includes(cause.status)) setSelected("");
        setCursor(null);
        setError(cause instanceof Error ? cause.message : "Unable to load the event music queue.");
      }
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, [authorized, endpoint, session.uid]);

  useEffect(() => {
    if (authorized) void load();
    return () => { generation.current++; };
  }, [authorized, load]);

  return <main id="main-content" className="workspace-main">
    <PageHeading
      eyebrow="Event operations / audio"
      title="Music review queue"
      description="Open submitted tracks, record a review outcome, and request corrections when needed. Review does not approve event compliance or change entry readiness."
      action={<Link href={`/admin/${segment(chapterId)}/events/${segment(eventId)}`} className="button button-outline">Event overview</Link>}
    />
    {!authorized ? <p role="alert" className="form-error">This account does not have reviewer access for this chapter.</p>
          : <>
            {error && <p role="alert" className="form-error">{error}</p>}
            <div className="grid gap-5 xl:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.5fr)]">
              <section className="panel connected-stack" aria-labelledby="music-queue-heading">
                <div className="panel-heading">
                  <div><h2 id="music-queue-heading">Pending tracks</h2><p>Event {eventId}</p></div>
                  <button type="button" className="button button-outline" disabled={loading} onClick={() => void load()}>Refresh</button>
                </div>
                {loading && <p role="status">Loading music submissions…</p>}
                {!loading && items.length === 0 && !cursor && !error && <p>No pending tracks are on this page.</p>}
                <ul className="connected-list">
                  {items.map(item => <li key={item.entry_id}>
                    <button type="button" className="w-full text-left" aria-current={selected === item.entry_id ? "true" : undefined} onClick={() => setSelected(item.entry_id)}>
                      <strong>Entry {item.entry_id}</strong>
                      <p>Version {item.version} · {(item.duration_ms / 1000).toFixed(3)} seconds</p>
                      <p>Submitted {new Date(item.submitted_at * 1000).toLocaleString()}</p>
                      <Status tone="amber">pending review</Status>
                    </button>
                  </li>)}
                </ul>
                {items.length === 0 && cursor && <p>No pending tracks on this page. Continue to the next page.</p>}
                {cursor && <button type="button" className="button button-outline" disabled={loading} onClick={() => void load(cursor)}>Load next page</button>}
              </section>
              <section className="panel connected-stack" aria-labelledby="music-review-detail">
                {selected && session ? <>
                  <div className="panel-heading"><div><h2 id="music-review-detail">Track review</h2><p>Entry {selected}</p></div><Link className="button button-outline" href={`/admin/${segment(chapterId)}/events/${segment(eventId)}/registrations/${segment(selected)}`}>Open entry</Link></div>
                  <MusicReview
                    key={`${session.uid}:${chapterId}:${eventId}:${selected}`}
                    uid={session.uid}
                    chapterId={chapterId}
                    eventId={eventId}
                    entryId={selected}
                    onSavedDecision={() => { setItems(current => current.filter(item => item.entry_id !== selected)); setSelected(""); }}
                  />
                </> : <><h2 id="music-review-detail">Track review</h2><p>Select a pending track to inspect its submission and record a decision.</p></>}
              </section>
            </div>
          </>}
  </main>;
}
