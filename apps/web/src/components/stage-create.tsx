"use client";
import { useState, type FormEvent } from "react";
import { ApiError } from "@/lib/connected-api";
import { registrationCommand } from "@/lib/registration-command";

export function StageCreate({ base, uid, onCreated }: { base: string; uid: string; onCreated: () => void }) {
  const [id, setId] = useState("");
  const [single, setSingle] = useState(true);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function create(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const value = await registrationCommand<{ stage_id: string }>(`${base}/stage-create`, { stage_id: id.trim(), single_performer: single, reason: reason.trim() }, "POST", false, uid);
      setNotice(`Stage ${value.stage_id} created on hold. Select it below, assign marshals, then release the hold when ready.`);
      setId(""); setReason(""); onCreated();
    } catch (reason) {
      setError(reason instanceof ApiError && reason.status === 409 ? "This stage ID or operation is already in use. Review the stage list before creating another stage." : reason instanceof Error ? reason.message : "Unable to create the stage.");
    } finally { setBusy(false); }
  }
  return <section className="panel stage-create"><h2>Create event stage</h2><p>Stages start on hold with no assigned marshals. Creation requires a connection.</p>
    <form onSubmit={create}><label htmlFor="new-stage-id">New stage ID</label><input id="new-stage-id" required maxLength={200} pattern="[A-Za-z0-9_-]+" value={id} onChange={event => setId(event.target.value)} disabled={busy} aria-describedby="new-stage-help"/><p id="new-stage-help" className="fineprint">Use a unique ID with letters, numbers, underscores or hyphens. It cannot be renamed here.</p>
      <label><input type="checkbox" checked={single} onChange={event => setSingle(event.target.checked)} disabled={busy}/> One performer at a time</label>
      <label htmlFor="new-stage-reason">Reason for creating this stage</label><textarea id="new-stage-reason" rows={3} minLength={8} maxLength={1000} required value={reason} onChange={event => setReason(event.target.value)} disabled={busy}/>
      <button className="button button-volt" disabled={busy || reason.trim().length < 8} style={{minHeight:56}}>{busy ? "Creating stage…" : "Create stage on hold"}</button>
    </form>{error && <p className="form-error" role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
  </section>;
}
