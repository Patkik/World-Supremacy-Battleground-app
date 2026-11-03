"use client";

import { useState } from "react";
import { connectedRequest, segment } from "@/lib/connected-api";

type EventWindow = {
  id: string;
  timezone: string | null;
  registration_opens_at: number | null;
  registration_closes_at: number | null;
  revision: number;
  status: string;
};

function localInput(value: number | null, timezone: string | null) {
  if (value === null || !timezone) return "";
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date(value * 1000));
    const part = (type: string) => parts.find(item => item.type === type)?.value || "";
    return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
  } catch {
    return "";
  }
}

export function RegistrationWindowForm({
  chapterId, event, uid, onSaved,
}: {
  chapterId: string;
  event: EventWindow;
  uid: string;
  onSaved: (event: EventWindow) => void;
}) {
  const [opens, setOpens] = useState(() => localInput(event.registration_opens_at, event.timezone));
  const [closes, setCloses] = useState(() => localInput(event.registration_closes_at, event.timezone));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [operationId, setOperationId] = useState("");
  const update = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setOperationId("");
    setNotice("");
    setError("");
  };

  async function save() {
    setBusy(true);
    setNotice("");
    setError("");
    const op = operationId || crypto.randomUUID();
    setOperationId(op);
    try {
      const saved = await connectedRequest<EventWindow>(
        `/v1/chapters/${segment(chapterId)}/events/${segment(event.id)}/registration-window`,
        {
          operation_id: op,
          reason: reason.trim(),
          expected_revision: event.revision,
          opens_at_local: opens || null,
          closes_at_local: closes || null,
        },
        "PUT",
        uid,
      );
      if (saved.id !== event.id || saved.timezone !== event.timezone || typeof saved.status !== "string"
        || !Number.isSafeInteger(saved.revision)
        || (saved.registration_opens_at !== null && !Number.isFinite(saved.registration_opens_at))
        || (saved.registration_closes_at !== null && !Number.isFinite(saved.registration_closes_at))) throw new Error("The saved registration window could not be verified.");
      onSaved(saved);
      setOperationId("");
      setNotice(`Saved as event revision ${saved.revision}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save registration dates.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="mt-5 border-t border-white/10 pt-5" aria-labelledby={`registration-window-${event.id}`}>
    <h3 id={`registration-window-${event.id}`}>Registration window</h3>
    <p className="fineprint">Times use {event.timezone || "the event timezone"}. Saving dates does not open registration. {event.status !== "draft" && "Only draft events can be changed."}</p>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="field-label">Opens
        <input type="datetime-local" value={opens} disabled={busy || !event.timezone || event.status !== "draft"} onChange={e => update(setOpens)(e.target.value)} />
      </label>
      <label className="field-label">Closes
        <input type="datetime-local" value={closes} disabled={busy || !event.timezone || event.status !== "draft"} onChange={e => update(setCloses)(e.target.value)} />
      </label>
    </div>
    <label className="field-label mt-3">Reason for changing registration dates
      <textarea value={reason} minLength={8} maxLength={1000} required disabled={busy || event.status !== "draft"} onChange={e => update(setReason)(e.target.value)} />
    </label>
    <div className="connected-actions mt-3">
      <button type="button" className="button button-outline" disabled={busy || !event.timezone || event.status !== "draft" || (!!opens !== !!closes) || reason.trim().length < 8} onClick={() => void save()}>
        {busy ? "Saving…" : "Save registration dates"}
      </button>
      <span className="fineprint">Leave both blank to clear the window.</span>
    </div>
    {notice && <p role="status">{notice}</p>}
    {error && <p role="alert" className="form-error">{error}</p>}
  </section>;
}
