"use client";

import { use, useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { PageHeading, Status } from "@/components/ui";
import { useWorkspaceSession } from "@/lib/account";
import { ApiError, connectedPage, connectedRequest, segment } from "@/lib/connected-api";

type DivisionPolicy = {
  id: string;
  name: string;
  min_members: number;
  max_members: number;
  max_duration_secs: number;
  max_age: number | null;
  fee_minor: number;
};
type Draft = {
  chapter_id: string;
  event_id: string;
  division_id: string;
  currency: string;
  version: number;
  revision: number;
  status: "draft";
  policy: DivisionPolicy;
  rules_source: string;
  rules_version: string;
  effective_date: string;
  created_by: string;
  created_at: number;
  updated_at: number;
};
type DraftVersion = { version: number; actor_uid: string; saved_at: number; snapshot: Draft };
type Page<T> = { items: T[]; next_page: string | null };

export function DivisionPolicyDrafts({ params }: { params: Promise<{ chapterId: string; eventId: string }> }) {
  const { chapterId, eventId } = use(params);
  const { session, loading: sessionLoading, error: sessionError } = useWorkspaceSession(chapterId);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [selected, setSelected] = useState<Draft | null>(null);
  const [divisionId, setDivisionId] = useState("");
  const [name, setName] = useState("");
  const [minMembers, setMinMembers] = useState("1");
  const [maxMembers, setMaxMembers] = useState("1");
  const [maxDuration, setMaxDuration] = useState("180");
  const [maxAge, setMaxAge] = useState("");
  const [feeMinor, setFeeMinor] = useState("0");
  const [rulesSource, setRulesSource] = useState("");
  const [rulesVersion, setRulesVersion] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [reason, setReason] = useState("");
  const [operationId, setOperationId] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [historyFor, setHistoryFor] = useState("");
  const [history, setHistory] = useState<DraftVersion[]>([]);
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);
  const allowed = !!session && session.chapter_id === chapterId && session.role === "chapter_director";
  const uid = session?.uid;
  const base = `/v1/chapters/${segment(chapterId)}/events/${segment(eventId)}/division-policy-drafts`;

  const loadDrafts = useCallback(async (next?: string | null) => {
    if (!uid || !allowed) return;
    setLoading(true); setError("");
    try {
      const page = await connectedPage<Draft>(base, next, uid);
      setDrafts(current => next ? [...current, ...page.items] : page.items);
      setCursor(page.next_page);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load division drafts.");
    } finally { setLoading(false); }
  }, [allowed, base, uid]);

  useEffect(() => { if (allowed) void loadDrafts(); }, [allowed, loadDrafts]);

  function edit(draft: Draft) {
    setSelected(draft);
    setDivisionId(draft.division_id);
    setName(draft.policy.name);
    setMinMembers(String(draft.policy.min_members));
    setMaxMembers(String(draft.policy.max_members));
    setMaxDuration(String(draft.policy.max_duration_secs));
    setMaxAge(draft.policy.max_age == null ? "" : String(draft.policy.max_age));
    setFeeMinor(String(draft.policy.fee_minor));
    setRulesSource(draft.rules_source);
    setRulesVersion(draft.rules_version);
    setEffectiveDate(draft.effective_date);
    setReason("");
    setOperationId(""); setError(""); setNotice("");
  }

  function changed(setter: (value: string) => void, value: string) {
    setter(value);
    setOperationId("");
    setNotice("");
    setError("");
  }

  function reset() {
    setSelected(null); setDivisionId(""); setName(""); setMinMembers("1"); setMaxMembers("1");
    setMaxDuration("180"); setMaxAge(""); setFeeMinor("0"); setRulesSource("");
    setRulesVersion(""); setEffectiveDate(""); setOperationId(""); setError(""); setNotice("");
    setReason("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!uid || !allowed) return;
    setBusy(true); setError(""); setNotice("");
    const op = operationId || crypto.randomUUID();
    setOperationId(op);
    try {
      const saved = await connectedRequest<Draft>(`${base}/${segment(divisionId)}`, {
        operation_id: op,
        reason: reason.trim(),
        expected_revision: selected?.revision ?? 0,
        name,
        min_members: Number(minMembers),
        max_members: Number(maxMembers),
        max_duration_secs: Number(maxDuration),
        max_age: maxAge ? Number(maxAge) : null,
        fee_minor: Number(feeMinor),
        rules_source: rulesSource,
        rules_version: rulesVersion,
        effective_date: effectiveDate,
      }, "PUT", uid);
      setDrafts(current => current.some(item => item.division_id === saved.division_id)
        ? current.map(item => item.division_id === saved.division_id ? saved : item)
        : [saved, ...current]);
      setHistoryFor(""); setHistory([]); setHistoryCursor(null);
      edit(saved);
      setNotice(`Saved draft version ${saved.version}. It is not available for participant registration.`);
    } catch (cause) {
      setError(cause instanceof ApiError && cause.status === 409
        ? "This draft changed in another session. Refresh the list and review the latest version before saving."
        : cause instanceof Error ? cause.message : "Unable to save the division draft.");
    } finally { setBusy(false); }
  }

  async function loadHistory(id: string, next?: string | null) {
    if (!uid) return;
    setBusy(true); setError("");
    try {
      const page = await connectedPage<DraftVersion>(`${base}/${segment(id)}/versions`, next, uid);
      setHistory(current => next ? [...current, ...page.items] : page.items);
      setHistoryCursor(page.next_page);
      setHistoryFor(id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load draft history.");
    } finally { setBusy(false); }
  }

  const validId = /^[a-z][a-z0-9-]{1,62}[a-z]$/.test(divisionId) && !divisionId.includes("--");
  const validLimits = Number.isSafeInteger(Number(minMembers)) && Number(minMembers) > 0
    && Number.isSafeInteger(Number(maxMembers)) && Number(maxMembers) >= Number(minMembers)
    && Number.isSafeInteger(Number(maxDuration)) && Number(maxDuration) > 0
    && (maxAge === "" || (Number.isSafeInteger(Number(maxAge)) && Number(maxAge) > 0 && Number(maxAge) <= 255))
    && Number.isSafeInteger(Number(feeMinor)) && Number(feeMinor) >= 0;

  return <main id="main-content" className="workspace-main">
    <PageHeading eyebrow={`Event / ${eventId}`} title="Division rule drafts" description="Prepare versioned event-specific division settings and record their source. Drafts do not change registration or judging." action={<Link className="button button-outline" href={`/admin/${segment(chapterId)}/events/${segment(eventId)}/divisions`}>Back to judge panels</Link>} />
    {sessionLoading ? <p role="status">Checking chapter access…</p>
      : !session ? <p role="alert" className="form-error">{sessionError || "Sign in to continue."}</p>
        : !allowed ? <p role="alert" className="form-error">Only the active chapter director can manage this chapter’s division drafts.</p>
          : <div className="connected-stack">
            <section className="panel connected-stack">
              <div><h2>{selected ? `Edit ${selected.division_id}` : "New division draft"}</h2><p className="fineprint">Rule values and source references are stored as director-supplied drafts. There is no publish or approval action here.</p></div>
              <form className="connected-stack" onSubmit={save}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="field-label">Division identifier
                    <input value={divisionId} onChange={e => changed(setDivisionId, e.target.value)} minLength={3} maxLength={64} pattern="[a-z][a-z0-9-]*[a-z0-9]" required disabled={busy || !!selected} />
                  </label>
                  <label className="field-label">Division name
                    <input value={name} onChange={e => changed(setName, e.target.value)} maxLength={120} required disabled={busy} />
                  </label>
                  <label className="field-label">Minimum roster size
                    <input type="number" min={1} max={1000} step={1} value={minMembers} onChange={e => changed(setMinMembers, e.target.value)} required disabled={busy} />
                  </label>
                  <label className="field-label">Maximum roster size
                    <input type="number" min={1} max={1000} step={1} value={maxMembers} onChange={e => changed(setMaxMembers, e.target.value)} required disabled={busy} />
                  </label>
                  <label className="field-label">Maximum performance duration (seconds)
                    <input type="number" min={1} max={3600} step={1} value={maxDuration} onChange={e => changed(setMaxDuration, e.target.value)} required disabled={busy} />
                  </label>
                  <label className="field-label">Maximum age (optional)
                    <input type="number" min={1} max={255} step={1} value={maxAge} onChange={e => changed(setMaxAge, e.target.value)} disabled={busy} />
                  </label>
                  <label className="field-label">Entry fee in chapter currency minor units
                    <input type="number" min={0} max={9007199254740991} step={1} value={feeMinor} onChange={e => changed(setFeeMinor, e.target.value)} required disabled={busy} />
                  </label>
                  <label className="field-label">Effective date
                    <input type="date" value={effectiveDate} onChange={e => changed(setEffectiveDate, e.target.value)} required disabled={busy} />
                  </label>
                  <label className="field-label">Rules source reference
                    <input value={rulesSource} onChange={e => changed(setRulesSource, e.target.value)} maxLength={500} required disabled={busy} />
                  </label>
                  <label className="field-label">Rules version
                    <input value={rulesVersion} onChange={e => changed(setRulesVersion, e.target.value)} maxLength={160} required disabled={busy} />
                  </label>
                </div>
                <label className="field-label">Reason for creating or changing this draft
                  <textarea value={reason} onChange={e => changed(setReason, e.target.value)} minLength={8} maxLength={1000} required disabled={busy} />
                </label>
                <div className="connected-actions">
                  <button className="button button-volt" type="submit" disabled={busy || reason.trim().length < 8 || !validId || !validLimits || !name.trim() || !effectiveDate || !rulesSource.trim() || !rulesVersion.trim()}>{busy ? "Saving…" : "Save draft version"}</button>
                  {selected && <button className="button button-outline" type="button" onClick={reset} disabled={busy}>Start another draft</button>}
                  {selected && <span className="fineprint">Next save creates an immutable version snapshot. Current draft version {selected.version}, revision {selected.revision}.</span>}
                </div>
              </form>
              {notice && <p role="status">{notice}</p>}
              {error && <p role="alert" className="form-error">{error}</p>}
            </section>
            <section className="panel connected-stack">
              <div className="panel-heading"><div><h2>Saved division drafts</h2><p>These records are separate from live division policies.</p></div><button className="button button-outline" type="button" onClick={() => void loadDrafts()} disabled={loading || busy}>Refresh</button></div>
              {loading && <p role="status">Loading division drafts…</p>}
              {!loading && drafts.length === 0 && !error && <p>No division drafts have been saved for this event.</p>}
              {drafts.map(draft => <article className="verification-row" key={draft.division_id}>
                <div className="verification-record"><strong>{draft.policy.name} <span className="mono">({draft.division_id})</span></strong><span>Version {draft.version} · revision {draft.revision} · {draft.policy.min_members}–{draft.policy.max_members} members · {draft.policy.max_duration_secs}s</span><span>{draft.currency} {draft.policy.fee_minor} minor units · rules: {draft.rules_source} · {draft.rules_version} · effective {draft.effective_date}</span></div>
                <Status tone="amber">Draft only</Status>
                <div className="connected-actions"><button className="button button-outline" type="button" onClick={() => edit(draft)} disabled={busy}>Edit draft</button><button className="button button-outline" type="button" onClick={() => void loadHistory(draft.division_id)} disabled={busy}>Version history</button></div>
              </article>)}
              {cursor && <button className="button button-outline" type="button" onClick={() => void loadDrafts(cursor)} disabled={loading || busy}>Load more drafts</button>}
              {historyFor && <div className="connected-stack" aria-label={`Version history for ${historyFor}`}><h3>{historyFor} history</h3>{history.map(version => <p key={version.version}>Version {version.version} · saved {new Date(version.saved_at * 1000).toLocaleString()} · by {version.actor_uid} · {version.snapshot.rules_source} ({version.snapshot.rules_version})</p>)}{historyCursor && <button className="button button-outline" type="button" onClick={() => void loadHistory(historyFor, historyCursor)} disabled={busy}>Load more history</button>}</div>}
            </section>
          </div>}
  </main>;
}
