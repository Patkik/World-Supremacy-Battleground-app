"use client";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ApiError, connectedRequest, segment } from "@/lib/connected-api";
import { Status } from "@/components/ui";
import { registrationCommand } from "@/lib/registration-command";

type Deduction = { code: string; reason: string; points: number };
type ReviewEntry = { entry_id: string; crew_id: string; completed_scorecards: number; deduction_revision: number; deductions: Deduction[] };
type Review = {
  division_id: string;
  name: string;
  locked: boolean;
  publication_id: string | null;
  panel: string[];
  approved_entries: number;
  unready_entries: number;
  completed_scorecards: number;
  entries: ReviewEntry[];
  next_page: string | null;
};

function compareDocumentIds(a: string, b: string): number {
  const left = new TextEncoder().encode(a), right = new TextEncoder().encode(b);
  for (let i = 0; i < Math.min(left.length, right.length); i++) if (left[i] !== right[i]) return left[i] - right[i];
  return left.length - right.length;
}

function validReview(value: unknown, division: string): value is Review {
  if (!value || typeof value !== "object") return false;
  const r = value as Partial<Review>;
  const count = (v: unknown) => Number.isSafeInteger(v) && (v as number) >= 0;
  if (r.division_id !== division || typeof r.name !== "string" || !r.name || typeof r.locked !== "boolean" || !(r.publication_id === null || typeof r.publication_id === "string") || !Array.isArray(r.panel) || r.panel.length > 20 || r.panel.some(v => typeof v !== "string" || !v || v.length > 200) || new Set(r.panel).size !== r.panel.length || !count(r.approved_entries) || !count(r.unready_entries) || !count(r.completed_scorecards) || !Number.isSafeInteger((r.approved_entries as number) * r.panel.length) || !Array.isArray(r.entries) || r.entries.length > 100 || !(r.next_page === null || (typeof r.next_page === "string" && r.next_page.length > 0 && r.next_page.length <= 200 && !r.next_page.includes("/") && r.next_page !== "." && r.next_page !== ".."))) return false;
  return r.entries.every(entry => entry && typeof entry.entry_id === "string" && !!entry.entry_id && typeof entry.crew_id === "string" && !!entry.crew_id && count(entry.completed_scorecards) && count(entry.deduction_revision) && Array.isArray(entry.deductions) && entry.deductions.every(d => d && typeof d.code === "string" && typeof d.reason === "string" && typeof d.points === "number" && Number.isFinite(d.points) && d.points >= 0)) && new Set(r.entries.map(entry => entry.entry_id)).size === r.entries.length;
}

type DraftRow = { code: string; reason: string; points: string };

function deductionError(status: number) {
  if (status === 401) return "Your session expired. Sign in again, then retry.";
  if (status === 403) return "Only the assigned head judge can record technical deductions for this division.";
  if (status === 409) return "The deduction record or division changed. The latest state was reloaded; review it before saving again.";
  if (status === 400) return "Check each deduction's code, reason and points.";
  return "The deductions could not be saved. Retry the same save to recover a lost response.";
}

function DeductionEditor({ base, entry, uid, onSaved, onConflict, onDenied, onPendingChange }: { base: string; entry: ReviewEntry; uid: string; onSaved: (revision: number, deductions: Deduction[]) => void; onConflict: (uncertain?: boolean) => Promise<void>; onDenied: () => void; onPendingChange: (pending: boolean) => void }) {
  const [rows, setRows] = useState<DraftRow[]>(entry.deductions.map(d => ({ code: d.code, reason: d.reason, points: String(d.points) })));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<Deduction[] | null>(null);

  function change(index: number, field: keyof DraftRow, value: string) {
    setRows(current => current.map((row, i) => i === index ? { ...row, [field]: value } : row));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setError("");
    const deductions: Deduction[] = pending ? [...pending] : [];
    for (const row of pending ? [] : rows) {
      const points = Number(row.points);
      if (!row.code.trim() || row.code.trim().length > 80 || !row.reason.trim() || row.reason.trim().length > 500 || !Number.isFinite(points) || points < 0 || points > 100) {
        setError("Each deduction needs a code (up to 80 characters), a reason (up to 500 characters) and points between 0 and 100.");
        return;
      }
      deductions.push({ code: row.code.trim(), reason: row.reason.trim(), points });
    }
    if (deductions.length > 50) { setError("At most 50 deductions per entry."); return; }
    setPending(deductions); onPendingChange(true); setBusy(true);
    try {
      const receipt = await registrationCommand<{ revision: number }>(`${base}/deductions`, { crew_id: entry.crew_id, expected_revision: entry.deduction_revision, deductions }, "PUT", false, uid,
        value => !!value && Number.isSafeInteger(value.revision) && value.revision === entry.deduction_revision + 1);
      onPendingChange(false); setPending(null);
      onSaved(receipt.revision, deductions);
    } catch (reason) {
      if (reason instanceof ApiError && [400, 401, 403, 404, 409, 422].includes(reason.status)) {
        onPendingChange(false); setPending(null);
        if ([401, 403].includes(reason.status)) { onDenied(); return; }
        if (reason.status === 409) { await onConflict(); return; }
      }
      setError(deductionError(reason instanceof ApiError ? reason.status : 0));
    } finally { setBusy(false); }
  }

  return <form className="connected-stack" onSubmit={save}>
    {rows.map((row, index) => <div className="panel" key={index}>
      <label htmlFor={`code-${entry.entry_id}-${index}`}>Deduction code</label>
      <input id={`code-${entry.entry_id}-${index}`} required maxLength={80} value={row.code} disabled={busy || !!pending} onChange={e => change(index, "code", e.target.value)} />
      <label htmlFor={`reason-${entry.entry_id}-${index}`}>Reason</label>
      <input id={`reason-${entry.entry_id}-${index}`} required maxLength={500} value={row.reason} disabled={busy || !!pending} onChange={e => change(index, "reason", e.target.value)} />
      <label htmlFor={`points-${entry.entry_id}-${index}`}>Points deducted</label>
      <input id={`points-${entry.entry_id}-${index}`} type="number" min={0} max={100} step="0.25" required value={row.points} disabled={busy || !!pending} onChange={e => change(index, "points", e.target.value)} />
      <button type="button" className="button button-ghost" disabled={busy || !!pending} onClick={() => setRows(current => current.filter((_, i) => i !== index))}>Remove deduction</button>
    </div>)}
    <div className="connected-actions">
      <button type="button" className="button button-outline" disabled={busy || !!pending} onClick={() => setRows(current => [...current, { code: "", reason: "", points: "0" }])}>Add deduction</button>
      <button type="submit" className="button button-volt" disabled={busy}>{busy ? "Saving deductions…" : pending ? "Retry same deductions" : "Save deductions"}</button>
    </div>
    {pending && !busy && <button type="button" className="button button-outline" onClick={() => { onPendingChange(false); setPending(null); void onConflict(true); }}>Check saved division state</button>}
    {pending && <p className="fineprint">The previous save may still finish. Retrying uses the same values; checking saved state reloads the review.</p>}
    <p className="fineprint">Deduction values are recorded as entered. The official deduction catalog and violation penalties require approved event rules; this form does not validate against them. Saving replaces the full deduction list for this entry.</p>
    {error && <p role="alert" className="form-error">{error}</p>}
  </form>;
}

export function HeadJudgeDivisionReview({ chapter, event, division, uid, director }: { chapter: string; event: string; division: string; uid: string; director: boolean }) {
  const base = `/v1/chapters/${segment(chapter)}/events/${segment(event)}/divisions/${segment(division)}`;
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmLock, setConfirmLock] = useState(false);
  const [deductionPending, setDeductionPending] = useState(false);
  const [receiptNeedsRefresh, setReceiptNeedsRefresh] = useState(false);

  const load = useCallback(async (next?: string | null) => {
    setLoading(true); setError("");
    try {
      const result = await connectedRequest<unknown>(`${base}/review${next ? `?cursor=${segment(next)}` : ""}`, undefined, "GET", uid);
      if (!validReview(result, division) || (next && result.next_page !== null && compareDocumentIds(result.next_page, next) <= 0) || result.entries.some((row, index) => (next && compareDocumentIds(row.entry_id, next) <= 0) || (index > 0 && compareDocumentIds(result.entries[index - 1].entry_id, row.entry_id) >= 0) || (result.next_page !== null && compareDocumentIds(row.entry_id, result.next_page) > 0))) throw new Error("Division review could not be verified. Refresh before continuing.");
      setReview(current => next && current ? { ...result, entries: [...current.entries, ...result.entries.filter(row => !current.entries.some(existing => existing.entry_id === row.entry_id))] } : result);
      if (!next) { setEditing(null); setConfirmLock(false); setReceiptNeedsRefresh(false); }
    } catch (reason) {
      if (!next || (reason instanceof ApiError && [401, 403].includes(reason.status))) setReview(null);
      setError(reason instanceof Error ? reason.message : "Unable to load the division review.");
    } finally { setLoading(false); }
  }, [base, uid, division]);
  useEffect(() => { void load(); }, [load]);

  async function lock() {
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await connectedRequest<{ event_id: string; division_id: string; locked: boolean }>(`${base}/lock`, undefined, "POST", uid);
      if (result.locked !== true || result.event_id !== event || result.division_id !== division) throw new Error("The server response did not confirm this division's lock.");
      setConfirmLock(false);
      setNotice("Division locked. Scorecards, readiness and deductions are frozen. Publication is a separate step at the chapter publication desk.");
      await load();
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Unable to confirm the lock outcome.";
      if (!(reason instanceof ApiError)) {
        setNotice("The lock outcome could not be confirmed. Reloading the saved division state before any retry.");
        await load();
        setError(message);
      } else {
        if ([401, 403].includes(reason.status)) { setReview(null); setConfirmLock(false); }
        if (reason.status === 409) await load();
        setError(reason.status === 409
          ? "The server did not lock the division. Its latest state is loaded; check entry readiness, scorecard completion and panel authorization before retrying."
          : message);
      }
    } finally { setBusy(false); }
  }

  if (loading && !review) return <p role="status">Loading division review…</p>;
  if (error && !review) return <p role="alert" className="form-error">{error}</p>;
  if (!review) return <p role="status">No division review is available.</p>;

  const required = review.approved_entries * review.panel.length;
  const complete = review.panel.length > 0 && review.approved_entries > 0 && review.unready_entries === 0 && review.completed_scorecards === required;

  return <div className="connected-stack">
    <section className="panel" aria-labelledby="division-review-heading">
      <div className="panel-heading"><div><h2 id="division-review-heading">{review.name}</h2><p className="mono">{review.division_id}</p></div><Status tone={review.locked ? "volt" : complete ? "volt" : "amber"}>{review.locked ? "Locked" : complete ? "Scorecards complete" : "Incomplete"}</Status></div>
      <p>{review.approved_entries} approved entries · {review.completed_scorecards} of {required} scorecards recorded · {review.unready_entries} unready · panel of {review.panel.length}</p>
      <p className="fineprint">The server rechecks panel membership and all lock conditions when you lock.</p>
      {review.publication_id && <p className="fineprint">Published as {review.publication_id}. Corrections and republication are not available.</p>}
      {!review.locked && <div className="connected-actions">
        {!confirmLock
          ? <button type="button" className="button button-volt" disabled={busy || deductionPending || receiptNeedsRefresh || loading || !complete} onClick={() => setConfirmLock(true)}>Lock division</button>
          : <>
            <p role="alert">Locking is permanent in this workflow. It freezes scorecards, entry readiness and deductions for this division. Results are not published by this action.</p>
            <button type="button" className="button button-volt" disabled={busy || deductionPending || receiptNeedsRefresh || loading || !complete} onClick={() => void lock()}>{busy ? "Confirming lock…" : "Confirm division lock"}</button>
            <button type="button" className="button button-outline" disabled={busy || deductionPending} onClick={() => setConfirmLock(false)}>Cancel</button>
          </>}
        <button type="button" className="button button-outline" disabled={busy || deductionPending || loading} onClick={() => void load()}>Refresh review</button>
      </div>}
      {!complete && !review.locked && <p className="fineprint">Locking is disabled until every approved entry is ready and every panel judge has a recorded scorecard for each approved entry.</p>}
      {review.locked && <button type="button" className="button button-outline" disabled={busy || deductionPending || loading} onClick={() => void load()}>Refresh review</button>}
      {error && <p role="alert" className="form-error">{error}</p>}{notice && <p role="status">{notice}</p>}
    </section>

    <section className="panel" aria-labelledby="deductions-heading">
      <h2 id="deductions-heading">Technical deductions</h2>
      <p>Only the assigned head judge records deductions, and only before the division locks. Individual judge scores are never shown here.</p>
      {review.entries.length === 0 ? <p>{review.next_page ? "No approved entries on the loaded pages. More entries are available to check." : "No approved entries in the loaded pages."}</p> : <ul className="connected-list">
        {review.entries.map(entry => <li key={entry.entry_id} className="panel">
          <div className="panel-heading"><div><h3>{entry.crew_id}</h3><p className="mono">{entry.entry_id}</p></div><Status tone={review.panel.length > 0 && entry.completed_scorecards === review.panel.length ? "volt" : "amber"}>{entry.completed_scorecards} of {review.panel.length} scorecards</Status></div>
          {entry.deductions.length === 0 ? <p>No deductions recorded.</p> : <ul>{entry.deductions.map((deduction, index) => <li key={index}><strong>{deduction.code}</strong> · −{deduction.points} pts · {deduction.reason}</li>)}</ul>}
          {!review.locked && !director && <button type="button" className="button button-outline" disabled={busy || deductionPending || receiptNeedsRefresh || loading} onClick={() => setEditing(current => current === entry.entry_id ? null : entry.entry_id)}>{editing === entry.entry_id ? "Close deduction editor" : entry.deductions.length ? "Edit deductions" : "Record deductions"}</button>}
          {!review.locked && editing === entry.entry_id && <DeductionEditor key={`${entry.entry_id}/${entry.deduction_revision}`} base={base} entry={entry} uid={uid} onPendingChange={setDeductionPending} onSaved={(revision, deductions) => { setReview(current => current ? { ...current, entries: current.entries.map(row => row.entry_id === entry.entry_id ? { ...row, deduction_revision: revision, deductions } : row) } : current); setEditing(null); setReceiptNeedsRefresh(true); setNotice("Deduction command confirmed. Refresh before further changes; the saved state may have changed since this receipt."); }} onConflict={async (uncertain) => { await load(); setError(uncertain ? "The previous save may still complete. Review the refreshed state before editing again." : "The division or deductions changed. Review the refreshed state before saving again."); }} onDenied={() => { setReview(null); setError("Your access to this division is no longer available."); }} />}
        </li>)}
      </ul>}
      {review.next_page && <button type="button" className="button button-outline" disabled={busy || deductionPending || receiptNeedsRefresh || loading} onClick={() => void load(review.next_page)}>Load more entries</button>}
      <p className="fineprint">Entry rows cover loaded pages only; completion totals come from the server. Refresh returns to the first page.</p>
      <p className="fineprint">This review reports completion and recorded deductions. No approved scoring discrepancy threshold is configured here, so it does not flag outliers or determine ties, placements or qualification.</p>
      {director && <p className="fineprint">Chapter directors review this state; deduction entry is limited to the assigned head judge.</p>}
    </section>
  </div>;
}
