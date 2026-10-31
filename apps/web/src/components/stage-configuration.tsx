"use client";
import { useEffect, useState, type FormEvent } from "react";
import { ApiError, connectedRequest, segment } from "@/lib/connected-api";
import { registrationCommand } from "@/lib/registration-command";

type Configuration = { active: boolean; single_performer: boolean; config_revision: number; held: boolean };
export function StageConfiguration({ base, stage, uid, onSaved }: { base: string; stage: string; uid: string; onSaved: (value: Configuration) => void }) {
  const [saved, setSaved] = useState<Configuration | null>(null);
  const [active, setActive] = useState(true);
  const [single, setSingle] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  function show(value: Configuration) { setSaved(value); setActive(value.active); setSingle(value.single_performer); }
  async function refresh() {
    setBusy(true); setError(""); setNotice("");
    try { show(await connectedRequest<Configuration>(`${base}/stages/${segment(stage)}`, undefined, "GET", uid)); }
    catch (reason) { setSaved(null); setError(reason instanceof Error ? reason.message : "Unable to load configuration."); }
    finally { setBusy(false); }
  }
  useEffect(() => { void refresh(); }, [base, stage, uid]);
  async function save(event: FormEvent) {
    event.preventDefault(); if (!saved) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await registrationCommand<Configuration>(`${base}/stage-configure`, { stage_id: stage, expected_revision: saved.config_revision, active, single_performer: single }, "POST", false, uid);
      const current = await connectedRequest<Configuration>(`${base}/stages/${segment(stage)}`, undefined, "GET", uid);
      show(current);
      setNotice("Configuration command accepted. Current saved settings are shown."); onSaved(current);
    } catch (reason) { setError(reason instanceof ApiError && reason.status === 409 ? "Configuration changed, the stage is not held, or a performance is active. Refresh and review before saving again." : reason instanceof Error ? reason.message : "Unable to save configuration."); }
    finally { setBusy(false); }
  }
  return <section className="panel stage-configuration"><h2>Stage configuration</h2><p>Put the stage on hold and complete every active performance before changing these settings. Deactivation hides the stage from marshals and blocks their commands; records and assignments are retained.</p>
    {saved ? <p>Saved configuration revision {saved.config_revision} · {saved.active ? "Active" : "Inactive"} · {saved.single_performer ? "One performer" : "Multiple performers"}</p> : <p role="status">{busy ? "Loading configuration…" : "Configuration unavailable."}</p>}
    <form onSubmit={save}><label><input type="checkbox" checked={active} onChange={event => setActive(event.target.checked)} disabled={busy || !saved}/> Stage active</label><label><input type="checkbox" checked={single} onChange={event => setSingle(event.target.checked)} disabled={busy || !saved}/> Limit stage to one performer</label><div className="connected-actions"><button className="button button-volt" style={{minHeight:56}} disabled={busy || !saved || (saved.active === active && saved.single_performer === single)}>Save stage configuration</button><button type="button" className="button button-outline" style={{minHeight:56}} disabled={busy} onClick={() => void refresh()}>Refresh stage configuration</button></div></form>
    {error && <p role="alert" className="form-error">{error}</p>}{notice && <p role="status">{notice}</p>}
  </section>;
}
