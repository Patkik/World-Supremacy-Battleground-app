"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Arrow, PageHeading } from "@/components/ui";
import { useWorkspaceSession } from "@/lib/account";
import { ApiError, connectedRequest, segment } from "@/lib/connected-api";

type EventRecord = {
  id: string;
  chapter_id: string;
  name: string;
  status: string;
  rules_version: string;
  event_date: string | null;
  timezone: string | null;
  venue: string | null;
};
type CreateEventCommand = { operation_id: string; reason: string; id: string; name: string; event_date: string; timezone: string; venue: string; rules_version: string };

function validPending(value: unknown): value is CreateEventCommand {
  if (!value || typeof value !== "object") return false;
  const command = value as Partial<CreateEventCommand>;
  return typeof command.operation_id === "string" && /^[a-f0-9-]{36}$/i.test(command.operation_id)
    && typeof command.id === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(command.id) && command.id.length <= 64
    && typeof command.name === "string" && command.name.length > 0 && command.name.length <= 120
    && typeof command.event_date === "string" && typeof command.timezone === "string"
    && typeof command.venue === "string" && typeof command.rules_version === "string"
    && typeof command.reason === "string" && command.reason.trim().length >= 8;
}

function clearPending(key: string) {
  try { sessionStorage.removeItem(key); } catch { /* Replaying the same command remains safe if tab storage cannot be cleared. */ }
}

function slugify(value: string) {
  return value.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64).replace(/-+$/g, "");
}

function errorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return error instanceof Error ? error.message : "The event draft could not be saved.";
  if (error.status === 401) return "Your session expired or needs recent sign-in. Sign in again, then retry.";
  if (error.status === 403) return "Only an active chapter director can create an event in this chapter.";
  if (error.status === 409) return "That event identifier is already in use, or this request changed. Choose another identifier and retry.";
  if (error.status === 400) return "Check the event identifier, date, timezone, and required fields.";
  if (error.status === 503) return "Event storage is unavailable. Your entries are still here; retry when the service is available.";
  if (error.status === 501) return "Event creation is not enabled in this environment.";
  return "The event draft could not be saved. Check your connection and retry.";
}

export default function CreateEventPage({ params }: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = use(params);
  const router = useRouter();
  const { session, loading: sessionLoading, error: sessionError } = useWorkspaceSession(chapterId);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [date, setDate] = useState("");
  const [timezone, setTimezone] = useState("");
  const [venue, setVenue] = useState("");
  const [rulesVersion, setRulesVersion] = useState("");
  const [reason, setReason] = useState("");
  const [operationId, setOperationId] = useState("");
  const [recovery, setRecovery] = useState<CreateEventCommand | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [online, setOnline] = useState(true);
  const allowed = !!session && session.role === "chapter_director" && session.chapter_id === chapterId;
  const recoveryKey = session ? `wsb:create-event:${JSON.stringify([session.uid, chapterId])}` : "";
  const activeScope = useRef("");
  activeScope.current = `${session?.uid ?? ""}:${chapterId}`;

  useEffect(() => {
    setRecovery(null); setOperationId(""); setName(""); setSlug(""); setSlugTouched(false);
    setDate(""); setTimezone(""); setVenue(""); setRulesVersion(""); setReason(""); setError("");
    if (!session) return;
    try {
      const saved = sessionStorage.getItem(recoveryKey);
      if (!saved) return;
      const parsed: unknown = JSON.parse(saved);
      if (!validPending(parsed)) { sessionStorage.removeItem(recoveryKey); return; }
      setRecovery(parsed); setOperationId(parsed.operation_id); setName(parsed.name); setSlug(parsed.id);
      setSlugTouched(true); setDate(parsed.event_date); setTimezone(parsed.timezone); setVenue(parsed.venue);
      setRulesVersion(parsed.rules_version); setReason(parsed.reason);
    } catch { setError("The saved event retry could not be recovered. The event may already exist; reload to check the chapter event list before creating another."); }
  }, [chapterId, recoveryKey, session?.uid]);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !allowed || busy) return;
    if (!online) { setError("Connect to the event service before saving this draft."); return; }
    const requestScope = `${session.uid}:${chapterId}`;
    const command: CreateEventCommand = recovery ?? {
      operation_id: operationId || crypto.randomUUID(), reason: reason.trim(), id: slug,
      name: name.trim(), event_date: date, timezone: timezone.trim(), venue: venue.trim(), rules_version: rulesVersion.trim(),
    };
    setOperationId(command.operation_id);
    setBusy(true);
    setError("");
    try {
      if (!recovery) {
        try { sessionStorage.setItem(recoveryKey, JSON.stringify(command)); }
        catch { throw new Error("This tab could not save a retry reference, so the event draft was not sent. Enable session storage and try again."); }
        setRecovery(command);
      }
      const created = await connectedRequest<EventRecord>(
        `/v1/chapters/${segment(chapterId)}/events`,
        command,
        "POST",
        session.uid,
      );
      if (activeScope.current !== requestScope) return;
      if (created.id !== command.id || created.chapter_id !== chapterId || created.name !== command.name
        || created.status !== "draft" || created.rules_version !== command.rules_version
        || created.event_date !== command.event_date || created.timezone !== command.timezone || created.venue !== command.venue) {
        throw new Error("The saved event receipt could not be verified. Retry the saved request to recover its outcome.");
      }
      clearPending(recoveryKey);
      setRecovery(null);
      router.push(`/admin/${segment(chapterId)}/events/${segment(created.id)}`);
    } catch (cause) {
      if (activeScope.current === requestScope) {
        setError(errorMessage(cause));
        if (cause instanceof ApiError && [400, 403, 409, 422].includes(cause.status)) {
          clearPending(recoveryKey); setRecovery(null); setOperationId("");
        }
      }
    } finally {
      if (activeScope.current === requestScope) setBusy(false);
    }
  }

  return <main id="main-content" className="workspace-main">
    <PageHeading
      eyebrow={`Chapter command / ${chapterId}`}
      title="Create an event draft"
      description="Save the event shell first. Registration stays closed until its event setup is reviewed and opened."
      action={<Link href={`/admin/${segment(chapterId)}/events`} className="button button-outline">Cancel</Link>}
    />
    {sessionLoading ? <p role="status">Checking chapter access…</p>
      : !session ? <p role="alert" className="form-error">{sessionError || "Sign in with your chapter account to continue."}</p>
        : !allowed ? <p role="alert" className="form-error">Event drafts are available to the active chapter director for this chapter.</p>
          : <section className="panel" aria-labelledby="event-form-heading">
            <div className="panel-heading"><div><h2 id="event-form-heading">Event details</h2><p>Saved as a private draft under {chapterId}.</p></div></div>
            <form onSubmit={submit} className="connected-stack" aria-describedby="event-draft-note">
              {recovery && <p role="status">A saved event creation may still be processing. Retry this exact request to recover the same event.</p>}
              <label>Event name
                <input required maxLength={120} value={name} disabled={busy || !!recovery} onChange={e => { setName(e.target.value); setOperationId(""); if (!slugTouched) setSlug(slugify(e.target.value)); }} />
              </label>
              <label>Event URL identifier
                  <input required minLength={3} maxLength={64} pattern="[a-z0-9]+(-[a-z0-9]+)*" autoCapitalize="none" spellCheck={false} value={slug} disabled={busy || !!recovery} onChange={e => { setSlug(e.target.value); setSlugTouched(true); setOperationId(""); }} />
                <span className="fineprint">Lowercase letters, numbers, and single hyphens. This identifier is reserved across chapters.</span>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label>Event date
                  <input type="date" required value={date} disabled={busy || !!recovery} onChange={e => { setDate(e.target.value); setOperationId(""); }} />
                </label>
                <label>Time zone
                  <input required maxLength={64} placeholder="Asia/Manila" value={timezone} disabled={busy || !!recovery} onChange={e => { setTimezone(e.target.value); setOperationId(""); }} />
                  <span className="fineprint">Use an IANA name such as Asia/Manila or Australia/Sydney.</span>
                </label>
              </div>
              <label>Venue
                <input required maxLength={240} value={venue} disabled={busy || !!recovery} onChange={e => { setVenue(e.target.value); setOperationId(""); }} />
              </label>
              <label>Rules source or version reference
                <input required maxLength={160} value={rulesVersion} disabled={busy || !!recovery} onChange={e => { setRulesVersion(e.target.value); setOperationId(""); }} placeholder="Enter the source name or version supplied to your chapter" />
                <span className="fineprint">This stores your reference. WSB does not verify that the source is an approved rulebook.</span>
              </label>
              <label>Reason for creating this event draft
                <textarea required minLength={8} maxLength={1000} value={reason} disabled={busy || !!recovery} onChange={e => { setReason(e.target.value); setOperationId(""); }} />
              </label>
              <div id="event-draft-note" className="info-note">The event remains a draft. Registration windows, divisions, stage structure, and publication are configured separately. No official rule status is inferred from this form.</div>
              {error && <p role="alert" className="form-error">{error}</p>}
              {!online && <p role="status" className="form-error">You are offline. The event draft has not been saved.</p>}
              <div><button className="button button-volt" type="submit" disabled={busy || !online}>{busy ? "Saving draft…" : recovery ? "Retry saved event draft" : "Save event draft"}<Arrow /></button></div>
            </form>
          </section>}
  </main>;
}
