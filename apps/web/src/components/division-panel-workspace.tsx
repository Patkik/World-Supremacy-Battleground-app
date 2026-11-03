"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ApiError, connectedPage, connectedRequest, segment } from "@/lib/connected-api";
import { useWorkspaceSession } from "@/lib/account";
import { registrationCommand } from "@/lib/registration-command";
import { PageHeading } from "@/components/ui";

type Division = { id: string; name: string };
type PanelConfiguration = { division_id: string; revision: number; panel: string[]; locked: boolean; completed_scorecards: number };

function validPanel(value: unknown, divisionId: string): value is PanelConfiguration {
  if (!value || typeof value !== "object") return false;
  const panel = value as Partial<PanelConfiguration>;
  return panel.division_id === divisionId && Number.isSafeInteger(panel.revision) && (panel.revision ?? -1) >= 0
    && Array.isArray(panel.panel) && panel.panel.every(uid => typeof uid === "string" && uid.length > 0)
    && typeof panel.locked === "boolean" && Number.isSafeInteger(panel.completed_scorecards) && (panel.completed_scorecards ?? -1) >= 0;
}

function PanelEditor({ chapter, event, division, uid }: { chapter: string; event: string; division: Division; uid: string }) {
  const [config, setConfig] = useState<PanelConfiguration | null>(null);
  const [panelText, setPanelText] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const path = `/v1/chapters/${segment(chapter)}/events/${segment(event)}/divisions/${segment(division.id)}/judge-panel`;

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const value = await connectedRequest<PanelConfiguration>(path, undefined, "GET", uid);
      if (!validPanel(value, division.id)) throw new Error("The judge panel could not be verified for this division.");
      setConfig(value); setPanelText(value.panel.join("\n"));
    } catch (cause) {
      setConfig(null); setError(cause instanceof Error ? cause.message : "Unable to load the current judge panel.");
    } finally { setLoading(false); }
  }, [path, uid]);
  useEffect(() => { void load(); }, [load]);

  async function save(eventObject: FormEvent<HTMLFormElement>) {
    eventObject.preventDefault();
    if (!config) return;
    const panel = panelText.split(/[\s,]+/).filter(Boolean);
    if (!reason.trim() || panel.length < 1 || panel.length > 20) {
      setError("Enter 1–20 unique judge account UIDs and a reason of at least eight characters."); return;
    }
    setBusy(true); setError(""); setNotice("");
    try {
      const value = await registrationCommand<PanelConfiguration>(path,
        { expected_revision: config.revision, panel, reason: reason.trim() },
        "PUT", false, uid);
      if (!validPanel(value, division.id)) throw new Error("The saved panel response could not be verified for this division.");
      setConfig(value); setPanelText(value.panel.join("\n")); setReason("");
      setNotice("Judge panel saved and recorded in the chapter audit log.");
    } catch (cause) {
      setError(cause instanceof ApiError && cause.status === 401
        ? "Changing a judge panel requires a fresh sign-in. Sign out and sign in again, then retry."
        : cause instanceof ApiError && cause.status === 409
          ? "The panel changed or scoring has started. Reload to review the server state."
          : cause instanceof Error ? cause.message : "Unable to save the judge panel.");
    } finally { setBusy(false); }
  }

  const locked = Boolean(config?.locked || (config?.completed_scorecards ?? 0) > 0);
  return <section className="panel connected-stack" aria-labelledby={`panel-${division.id}`}>
    <div><h2 id={`panel-${division.id}`}>{division.name}</h2><p className="mono">{division.id}</p></div>
    {loading ? <p role="status">Loading panel…</p> : error && !config ? <p role="alert" className="form-error">{error}</p> : config && <>
      <p>{config.panel.length} assigned judge{config.panel.length === 1 ? "" : "s"} · revision {config.revision} · {config.completed_scorecards} recorded scorecards{config.locked ? " · locked" : ""}</p>
      {locked ? <p>Panel changes are disabled after scoring begins or the division locks.</p> : <form className="connected-stack" onSubmit={save}>
        <label htmlFor={`panel-uids-${division.id}`}>Judge account UIDs<textarea id={`panel-uids-${division.id}`} value={panelText} onChange={change => setPanelText(change.target.value)} rows={4} required disabled={busy} /></label>
        <p>Each judge must have an active chapter judge or head-judge role and an active assignment to this event. Add event access in <Link className="text-link" href={`/admin/${chapter}/staff`}>Staff & chapter access</Link> first. This interface supports 1–20 judges to match the scoring service limit; that limit is an implementation boundary, not an approved event rule.</p>
        <label htmlFor={`panel-reason-${division.id}`}>Reason for change<input id={`panel-reason-${division.id}`} value={reason} onChange={change => setReason(change.target.value)} minLength={8} maxLength={1000} required disabled={busy} /></label>
        {error && <p role="alert" className="form-error">{error}</p>}{notice && <p role="status">{notice}</p>}
        <button className="button button-volt" type="submit" disabled={busy || !reason.trim()}>{busy ? "Saving panel…" : "Save judge panel"}</button>
      </form>}
      {locked && <button className="button button-outline" type="button" onClick={() => void load()} disabled={busy}>Refresh</button>}
      {locked && error && <p role="alert" className="form-error">{error}</p>}{locked && notice && <p role="status">{notice}</p>}
    </>}
  </section>;
}

export function DivisionPanelWorkspace({ chapter, event }: { chapter: string; event: string }) {
  const { session, loading, error } = useWorkspaceSession(chapter);
  if (loading) return <main id="main-content" className="workspace-main"><PageHeading eyebrow={`Event / ${event}`} title="Division judge panels" description="Set event-assigned judges for each division before scoring starts."/><p role="status">Checking chapter access…</p></main>;
  if (!session) return <main id="main-content" className="workspace-main"><PageHeading title="Division judge panels" description="Set event-assigned judges for each division before scoring starts."/><p role="alert" className="form-error">{error || "Sign in to continue."}</p></main>;
  if (session.chapter_id !== chapter || session.role !== "chapter_director") return <main id="main-content" className="workspace-main"><PageHeading title="Division judge panels" description="Set event-assigned judges for each division before scoring starts."/><p role="alert" className="form-error">Only this chapter’s director can manage division judge panels.</p></main>;
  return <DivisionPanelContent key={`${session.uid}:${chapter}:${event}`} chapter={chapter} event={event} uid={session.uid}/>;
}

function DivisionPanelContent({ chapter, event, uid }: { chapter: string; event: string; uid: string }) {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async (next?: string | null) => {
    setLoading(true); setError("");
    try {
      const page = await connectedPage<Division>(`/v1/chapters/${segment(chapter)}/events/${segment(event)}/divisions`, next, uid);
      if (!Array.isArray(page.items) || page.items.some(division => typeof division.id !== "string" || !division.id || typeof division.name !== "string")
        || (page.next_page !== null && typeof page.next_page !== "string")) throw new Error("Divisions could not be verified for this event.");
      setDivisions(previous => next ? [...previous, ...page.items] : page.items); setCursor(page.next_page);
    } catch (cause) {
      setDivisions([]); setCursor(null); setError(cause instanceof Error ? cause.message : "Unable to load event divisions.");
    } finally { setLoading(false); }
  }, [chapter, event, uid]);
  useEffect(() => { void load(); }, [load]);
  return <main id="main-content" className="workspace-main">
    <PageHeading eyebrow={`Event / ${event}`} title="Division judge panels" description="Set event-assigned judges for each division before scoring starts." action={<div className="connected-actions"><Link className="button button-outline" href={`/admin/${segment(chapter)}/events/${segment(event)}/division-policies`}>Division rule drafts</Link><Link className="button button-outline" href={`/admin/${segment(chapter)}/events/${segment(event)}`}>Back to event</Link></div>} />
    {loading && <p role="status">Loading event divisions…</p>}
    {!loading && <>
      {error && <p role="alert" className="form-error">{error}</p>}
      {divisions.map(division => <PanelEditor key={division.id} chapter={chapter} event={event} division={division} uid={uid} />)}
      {!loading && divisions.length === 0 && !error && <section className="panel"><h2>No configured divisions</h2><p>Division configuration is not available for this event yet.</p></section>}
      {cursor && <button className="button button-outline" type="button" disabled={loading} onClick={() => void load(cursor)}>Load more divisions</button>}
      <p className="fineprint">Competition panel size and scoring policy still require approved WSB rule references. This page only configures currently supported panel membership.</p>
    </>}
  </main>;
}
