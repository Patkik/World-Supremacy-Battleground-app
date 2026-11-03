"use client";

import { useState } from "react";
import { connectedRequest, segment } from "@/lib/connected-api";

type EventDraft = {
  id: string;
  name: string;
  event_date: string | null;
  timezone: string | null;
  venue: string | null;
  rules_version: string;
  status: string;
  revision: number;
  registration_opens_at: number | null;
  registration_closes_at: number | null;
};

export function EventDraftForm({
  chapterId, event, uid, onSaved,
}: {
  chapterId: string;
  event: EventDraft;
  uid: string;
  onSaved: (event: EventDraft) => void;
}) {
  const [name, setName] = useState(event.name);
  const [eventDate, setEventDate] = useState(event.event_date || "");
  const [timezone, setTimezone] = useState(event.timezone || "");
  const [venue, setVenue] = useState(event.venue || "");
  const [rulesVersion, setRulesVersion] = useState(event.rules_version);
  const [reason, setReason] = useState("");
  const [operationId, setOperationId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const editable = event.status === "draft";
  const timezoneLocked = event.registration_opens_at !== null || event.registration_closes_at !== null;

  function changed(setter: (value: string) => void, value: string) {
    setter(value);
    setOperationId("");
    setMessage("");
    setError("");
  }

  async function save() {
    setBusy(true);
    setMessage("");
    setError("");
    const op = operationId || crypto.randomUUID();
    setOperationId(op);
    try {
      const saved = await connectedRequest<EventDraft>(
        `/v1/chapters/${segment(chapterId)}/events/${segment(event.id)}`,
        {
          operation_id: op,
          reason: reason.trim(),
          expected_revision: event.revision,
          name,
          event_date: eventDate,
          timezone,
          venue,
          rules_version: rulesVersion,
        },
        "PUT",
        uid,
      );
      if (saved.id !== event.id || typeof saved.name !== "string" || typeof saved.status !== "string"
        || typeof saved.rules_version !== "string" || !Number.isSafeInteger(saved.revision)
        || (saved.event_date !== null && typeof saved.event_date !== "string")
        || (saved.timezone !== null && typeof saved.timezone !== "string")
        || (saved.venue !== null && typeof saved.venue !== "string")
        || (saved.registration_opens_at !== null && !Number.isFinite(saved.registration_opens_at))
        || (saved.registration_closes_at !== null && !Number.isFinite(saved.registration_closes_at))) throw new Error("The event draft response could not be verified.");
      onSaved(saved);
      setOperationId("");
      setMessage(`Draft saved as revision ${saved.revision}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save event details.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="mt-5 border-t border-white/10 pt-5" aria-labelledby={`event-details-${event.id}`}>
    <h3 id={`event-details-${event.id}`}>Draft details</h3>
    <p className="fineprint">The rules source/version is a reference supplied by your chapter; this form does not verify rule approval.</p>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="field-label">Event name
        <input value={name} maxLength={120} disabled={busy || !editable} onChange={e => changed(setName, e.target.value)} />
      </label>
      <label className="field-label">Event date
        <input type="date" value={eventDate} disabled={busy || !editable} onChange={e => changed(setEventDate, e.target.value)} />
      </label>
      <label className="field-label">Timezone
        <input value={timezone} maxLength={64} placeholder="Asia/Manila" disabled={busy || !editable || timezoneLocked} onChange={e => changed(setTimezone, e.target.value)} />
      </label>
      <label className="field-label">Venue
        <input value={venue} maxLength={240} disabled={busy || !editable} onChange={e => changed(setVenue, e.target.value)} />
      </label>
      <label className="field-label sm:col-span-2">Rules source/version reference
        <input value={rulesVersion} maxLength={160} disabled={busy || !editable} onChange={e => changed(setRulesVersion, e.target.value)} />
      </label>
      <label className="field-label sm:col-span-2">Reason for changing this event draft
        <textarea value={reason} minLength={8} maxLength={1000} required disabled={busy || !editable} onChange={e => changed(setReason, e.target.value)} />
      </label>
    </div>
    {timezoneLocked && editable && <p className="fineprint">Clear the registration window before changing the timezone; saved registration instants are preserved.</p>}
    <div className="connected-actions mt-3">
      <button type="button" className="button button-outline" disabled={busy || !editable || !name.trim() || !eventDate || !timezone.trim() || !venue.trim() || !rulesVersion.trim()} onClick={() => void save()}>
        {busy ? "Saving…" : "Save draft details"}
      </button>
      {!editable && <span className="fineprint">Only draft event details can be changed.</span>}
    </div>
    {message && <p role="status">{message}</p>}
    {error && <p role="alert" className="form-error">{error}</p>}
  </section>;
}
