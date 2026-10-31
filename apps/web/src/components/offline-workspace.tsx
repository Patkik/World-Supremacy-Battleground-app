"use client";
import { useState, type FormEvent } from "react";
import { ConnectedScorecard } from "./connected-scorecard";
import { ScoreOutbox } from "./score-outbox";
import { Brand } from "./ui";

export function OfflineWorkspace() {
  const [event, setEvent] = useState(""); const [entry, setEntry] = useState("");
  const [selected, setSelected] = useState<{ event: string; entry: string } | null>(null);
  const [message, setMessage] = useState(""); const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function prepare() {
    setBusy(true); setError("");
    try {
      if (!navigator.serviceWorker || !navigator.locks) throw new Error("Use a current browser that supports offline judging.");
      await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      // Requesting persistence is a best effort. Browser eviction remains possible.
      const persistent = await navigator.storage?.persist?.();
      setMessage(persistent ? "Offline workspace prepared. Save a draft for each assigned entry before the venue loses connection." : "Offline workspace prepared. The browser may clear device storage, so keep this device’s browser data until all receipts arrive.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not prepare offline workspace."); }
    finally { setBusy(false); }
  }
  function open(eventForm: FormEvent) { eventForm.preventDefault(); setSelected({ event: event.trim(), entry: entry.trim() }); }
  if (selected?.entry) return <ConnectedScorecard eventId={selected.event} entryId={selected.entry} />;
  if (selected) return <ScoreOutbox eventId={selected.event} />;
  return <main id="main-content" className="system-page"><Brand /><div className="account-form"><h1>Offline judging workspace</h1><p>Prepare this trusted device while online. Only saved drafts and queued commands can be restored without a connection.</p>
    <button className="button button-volt" disabled={busy} onClick={prepare}>{busy ? "Preparing…" : "Prepare this trusted device"}</button>
    {message && <p role="status">{message}</p>}{error && <p className="form-error" role="alert">{error}</p>}
    <form onSubmit={open}><label htmlFor="offline-event">Event ID<input id="offline-event" value={event} onChange={e => setEvent(e.target.value)} required /></label><label htmlFor="offline-entry">Entry ID (optional)<input id="offline-entry" value={entry} onChange={e => setEntry(e.target.value)} /></label><button className="button button-outline">{entry ? "Open saved scorecard" : "Open event outbox"}</button></form>
    <p className="fineprint">Your Firebase browser session must still be available. Offline drafts require server authorization when the connection returns. Payment records, identity documents and private server responses are not cached.</p>
  </div></main>;
}
