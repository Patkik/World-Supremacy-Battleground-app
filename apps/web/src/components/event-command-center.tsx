"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWorkspaceSession } from "@/lib/account";
import { ApiError, connectedRequest, segment } from "@/lib/connected-api";
import { PageHeading, Status } from "@/components/ui";

type EventDetails = {
  id: string;
  chapter_id: string;
  name: string;
  status: string;
  rules_version: string;
  registration_closes_at: number | null;
  event_date?: string | null;
  timezone?: string | null;
  venue?: string | null;
};

function registrationClose(value: number | null, timezone: string | null | undefined) {
  if (value === null) return "Not configured";
  const date = new Date(value * 1000);
  if (!Number.isFinite(date.getTime())) return "Invalid event configuration";
  if (!timezone) return "Event timezone is not configured";
  try {
    const formatted = new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timezone,
    }).format(date);
    return `${formatted} (${timezone})`;
  } catch {
    return "Invalid event timezone";
  }
}

export function EventCommandCenter({ chapterId, eventId }: { chapterId: string; eventId: string }) {
  const { session, loading: sessionLoading, error: sessionError } = useWorkspaceSession(chapterId);
  const localTesting = process.env.NEXT_PUBLIC_WSB_LOCAL_TESTING === "true";
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const allowedRole = !!session && ["chapter_director", "registrar"].includes(session.role);
  const sameChapter = !!session && session.chapter_id === chapterId;

  useEffect(() => {
    if (!session || !allowedRole || !sameChapter) return;
    let active = true;
    setEvent(null);
    setLoading(true);
    setError("");
    connectedRequest<EventDetails>(
      `/v1/chapters/${segment(chapterId)}/events/${segment(eventId)}`,
      undefined,
      "GET",
      session.uid,
    ).then(value => { if (active) setEvent(value); })
      .catch(cause => {
        if (!active) return;
        setEvent(null);
        setError(cause instanceof ApiError && cause.status === 403
          ? "This event is outside your current assignment or chapter access."
          : cause instanceof ApiError && cause.status === 404
            ? "This event was not found in the selected chapter."
            : cause instanceof Error ? cause.message : "Unable to load event details.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [allowedRole, chapterId, eventId, sameChapter, session]);

  return <main id="main-content" className="workspace-main">
    <PageHeading
      eyebrow={`Event operations / ${chapterId.toUpperCase()}`}
      title={event?.name ?? "Event command center"}
      description="Use the connected registration, music, judging and schedule workspaces for this event."
      action={<Link href={`/admin/${segment(chapterId)}/events`} className="button button-outline">All events</Link>}
    />
    {sessionLoading ? <p role="status">Checking chapter access…</p>
      : !session ? <p role="alert" className="form-error">{sessionError || "Sign in with your chapter account to continue."}</p>
        : !sameChapter || !allowedRole ? <p role="alert" className="form-error">The event command center is available to a chapter director or assigned registrar for this chapter.</p>
          : loading ? <p role="status">Loading the event record…</p>
            : error ? <p role="alert" className="form-error">{error}</p>
              : event ? <>
                <section className="panel" aria-labelledby="event-record-heading">
                  <div className="panel-heading"><div><h2 id="event-record-heading">Event record</h2><p>{event.chapter_id} / {event.id}</p></div><Status>{event.status.replaceAll("_", " ")}</Status></div>
                  <dl className="grid gap-4 sm:grid-cols-3">
                    <div><dt className="eyebrow">Rules source/version reference</dt><dd className="mono">{event.rules_version || "Not set"}</dd></div>
                    <div><dt className="eyebrow">Registration closes</dt><dd>{registrationClose(event.registration_closes_at, event.timezone)}</dd></div>
                    <div><dt className="eyebrow">Configured status</dt><dd>{event.status.replaceAll("_", " ")}</dd></div>
                    {event.event_date && <div><dt className="eyebrow">Event date</dt><dd>{event.event_date}{event.timezone ? ` · ${event.timezone}` : ""}</dd></div>}
                    {event.venue && <div><dt className="eyebrow">Venue</dt><dd>{event.venue}</dd></div>}
                  </dl>
                </section>

                <section className="mt-6" aria-labelledby="event-workflows-heading">
                  <div className="panel-heading"><div><h2 id="event-workflows-heading">Event workflows</h2><p>Open the system of record for each operational task.</p></div></div>
                  <ul className="connected-list">
                    <li><Link href={`/admin/${segment(chapterId)}/events/${segment(eventId)}/registrations`} className="flex min-h-12 items-center justify-between gap-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"><span><strong>Registration review</strong><span className="block">Open submitted entries and server readiness details.</span></span><span aria-hidden="true">→</span></Link></li>
                    <li><Link href={`/admin/${segment(chapterId)}/events/${segment(eventId)}/music`} className="flex min-h-12 items-center justify-between gap-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"><span><strong>Music review</strong><span className="block">Review submitted WAV versions. Review does not establish compliance or readiness.</span></span><span aria-hidden="true">→</span></Link></li>
                    <li><Link href={`/admin/${segment(chapterId)}/events/${segment(eventId)}/divisions`} className="flex min-h-12 items-center justify-between gap-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"><span><strong>Division and judge panels</strong><span className="block">Inspect configured divisions and assigned judging panels.</span></span><span aria-hidden="true">→</span></Link></li>
                    <li><Link href={`/admin/${segment(chapterId)}/events/${segment(eventId)}/lineup`} className="flex min-h-12 items-center justify-between gap-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"><span><strong>Performance lineup</strong><span className="block">Manage the manual, revisioned event order.</span></span><span aria-hidden="true">→</span></Link></li>
                    <li><Link href={`/admin/${segment(chapterId)}/events/${segment(eventId)}/battles`} className="flex min-h-12 items-center justify-between gap-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"><span><strong>Battle drafts</strong><span className="block">Configure and activate chapter-scoped battle matches.</span></span><span aria-hidden="true">→</span></Link></li>
                    {localTesting && <li><Link href={`/admin/${segment(chapterId)}/events/${segment(eventId)}/waivers`} className="flex min-h-12 items-center justify-between gap-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"><span><strong>Waiver drafts</strong><span className="block">Prepare draft text only. Signing and consent are not enabled.</span></span><span aria-hidden="true">→</span></Link></li>}
                  </ul>
                </section>
                <p className="fineprint mt-6">This page shows the saved event configuration. It does not claim aggregate entry, roster, payment, identity, consent or music-compliance totals.</p>
              </> : <p role="status">No event record is available.</p>}
  </main>;
}
