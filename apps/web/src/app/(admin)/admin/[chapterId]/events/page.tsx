"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status } from "@/components/ui";
import { useWorkspaceSession } from "@/lib/account";
import { ApiError, connectedRequest, segment } from "@/lib/connected-api";
import { RegistrationWindowForm } from "@/components/registration-window-form";
import { EventDraftForm } from "@/components/event-draft-form";

type EventRecord = {
  id: string;
  chapter_id: string;
  name: string;
  event_date: string | null;
  timezone: string | null;
  venue: string | null;
  status: string;
  rules_version: string;
  registration_closes_at: number | null;
  registration_opens_at: number | null;
  revision: number;
};
type EventPage = { items: EventRecord[]; next_page: string | null };

function registrationClose(value: number | null) {
  if (!value) return "Not configured";
  const date = new Date(value * 1000);
  return Number.isFinite(date.getTime()) ? date.toISOString() : "Invalid saved timestamp";
}

function eventError(error: unknown) {
  if (error instanceof ApiError && error.status === 401) return "Your session expired. Sign in again to view chapter events.";
  if (error instanceof ApiError && error.status === 403) return "Only the active chapter director can manage chapter events.";
  if (error instanceof ApiError && error.status === 503) return "Event storage is unavailable. Retry when the service is available.";
  if (error instanceof ApiError && error.status === 501) return "Durable event management is not enabled in this environment.";
  return error instanceof Error ? error.message : "Unable to load saved chapter events.";
}

function validEvent(value: unknown, chapterId: string): value is EventRecord {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<EventRecord>;
  return event.chapter_id === chapterId && typeof event.id === "string" && event.id.length > 0
    && typeof event.name === "string" && typeof event.status === "string"
    && typeof event.rules_version === "string" && Number.isSafeInteger(event.revision)
    && (event.event_date === null || typeof event.event_date === "string")
    && (event.timezone === null || typeof event.timezone === "string")
    && (event.venue === null || typeof event.venue === "string")
    && (event.registration_opens_at === null || Number.isFinite(event.registration_opens_at))
    && (event.registration_closes_at === null || Number.isFinite(event.registration_closes_at));
}

export default function EventManagementPage({ params }: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = use(params);
  const { session, loading: sessionLoading, error: sessionError } = useWorkspaceSession(chapterId);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const allowed = !!session && session.chapter_id === chapterId && session.role === "chapter_director";
  const uid = session?.uid;
  const requestGeneration = useRef(0);
  const activeScope = useRef("");
  activeScope.current = `${uid ?? ""}:${chapterId}`;

  const load = useCallback(async (next?: string | null) => {
    if (!uid || !allowed) return;
    const generation = ++requestGeneration.current;
    const scope = `${uid}:${chapterId}`;
    setLoading(true);
    setError("");
    try {
      const suffix = next ? `?cursor=${segment(next)}` : "";
      const page = await connectedRequest<EventPage>(
        `/v1/chapters/${segment(chapterId)}/staff/events${suffix}`,
        undefined,
        "GET",
        uid,
      );
      if (!Array.isArray(page.items) || page.items.some(event => !validEvent(event, chapterId))
        || (page.next_page !== null && typeof page.next_page !== "string")) throw new Error("Event records could not be verified for this chapter.");
      if (generation === requestGeneration.current && activeScope.current === scope) {
        setEvents(current => next ? [...current, ...page.items] : page.items);
        setCursor(page.next_page);
      }
    } catch (cause) {
      if (generation === requestGeneration.current && activeScope.current === scope) {
        if (!next) { setEvents([]); setCursor(null); }
        setError(eventError(cause));
      }
    } finally {
      if (generation === requestGeneration.current && activeScope.current === scope) setLoading(false);
    }
  }, [allowed, chapterId, uid]);

  useEffect(() => {
    setEvents([]);
    setCursor(null);
    setError("");
    if (allowed) void load();
    return () => { requestGeneration.current++; };
  }, [allowed, load]);

  return <main id="main-content" className="workspace-main">
    <PageHeading
      eyebrow={`Chapter command / ${chapterId}`}
      title="Event management"
      description="Review saved event drafts and open the workspace for each event."
      action={<Link href={`/admin/${segment(chapterId)}/events/new`} className="button button-volt">Create event <Arrow /></Link>}
    />
    {sessionLoading ? <p role="status">Checking chapter access…</p>
      : !session ? <p role="alert" className="form-error">{sessionError || "Sign in with your chapter account to continue."}</p>
        : !allowed ? <p role="alert" className="form-error">Event management is available to the active chapter director for this chapter.</p>
          : <>
            {error && <section className="panel" role="alert"><p className="form-error">{error}</p><button className="button button-outline" type="button" onClick={() => void load()}>Retry</button></section>}
            {!error && !loading && events.length === 0 && <section className="panel"><h2>No saved event drafts</h2><p>Events you create for this chapter will appear here. A new event stays private until its setup is reviewed and opened.</p><Link href={`/admin/${segment(chapterId)}/events/new`} className="button button-volt">Create an event draft <Arrow /></Link></section>}
            <div className="connected-stack">
              {events.map(event => <article key={event.id} className="panel">
                <div className="panel-heading"><div><h2>{event.name}</h2><p className="mono">{event.id}</p></div><Status tone={event.status === "draft" ? "amber" : "volt"}>{event.status.replaceAll("_", " ")}</Status></div>
                <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div><dt className="eyebrow">Event date</dt><dd>{event.event_date ? `${event.event_date}${event.timezone ? ` · ${event.timezone}` : ""}` : "Not set"}</dd></div>
                  <div><dt className="eyebrow">Venue</dt><dd>{event.venue || "Not set"}</dd></div>
                  <div><dt className="eyebrow">Rules source reference</dt><dd>{event.rules_version || "Not recorded"}</dd></div>
                  <div><dt className="eyebrow">Registration cutoff</dt><dd>{registrationClose(event.registration_closes_at)}</dd></div>
                </dl>
                <div className="mt-5"><Link href={`/admin/${segment(chapterId)}/events/${segment(event.id)}`} className="button button-outline">Open command center <Arrow /></Link></div>
                {uid && <EventDraftForm
                  key={`${uid}:${chapterId}:${event.id}:draft`}
                  chapterId={chapterId}
                  event={event}
                  uid={uid}
                  onSaved={saved => { const updated = { ...event, ...saved }; if (saved.id === event.id && validEvent(updated, chapterId) && activeScope.current === `${uid}:${chapterId}`) setEvents(current => current.map(item => item.id === saved.id ? updated : item)); }}
                />}
                {uid && <RegistrationWindowForm
                  key={`${uid}:${chapterId}:${event.id}:window`}
                  chapterId={chapterId}
                  event={event}
                  uid={uid}
                  onSaved={saved => { if (saved.id === event.id && Number.isSafeInteger(saved.revision) && (saved.registration_opens_at === null || Number.isFinite(saved.registration_opens_at)) && (saved.registration_closes_at === null || Number.isFinite(saved.registration_closes_at)) && activeScope.current === `${uid}:${chapterId}`) setEvents(current => current.map(item => item.id === saved.id ? { ...item, ...saved } : item)); }}
                />}
              </article>)}
            </div>
            {loading && <p role="status">Loading saved events…</p>}
            {cursor && !loading && !error && <button type="button" className="button button-outline" onClick={() => void load(cursor)}>Load more events</button>}
          </>}
  </main>;
}
