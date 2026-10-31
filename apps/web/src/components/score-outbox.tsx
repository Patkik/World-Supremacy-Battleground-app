"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAccount } from "@/lib/account";
import { scoreStore, synchronizeScores } from "@/lib/judging/sync";
import type { ScoreOperation } from "@/lib/judging/outbox";
import { PageHeading } from "./ui";

export function ScoreOutbox({ eventId }: { eventId: string }) {
  const { user, loading, error: accountError } = useAccount();
  const [records, setRecords] = useState<ScoreOperation[]>([]);
  const [trusted, setTrusted] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    if (user && trusted) setRecords((await scoreStore.list(user.uid)).filter(r => r.event === eventId));
  }, [user, trusted, eventId]);
  useEffect(() => { refresh().catch(() => setError("Unable to open device storage.")); }, [refresh]);
  async function synchronize() {
    if (!user) return;
    setBusy(true); setError("");
    try { await synchronizeScores(user.uid); await refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to sync scores."); }
    finally { setBusy(false); }
  }
  async function removeAcknowledged() {
    if (!user || !navigator.locks) return;
    setBusy(true); setError("");
    try {
      await navigator.locks.request(`wsb-score-sync:${user.uid}`, async () => {
        const saved = await scoreStore.list(user.uid);
        for (const record of saved.filter(r => r.event === eventId && r.state === "acknowledged")) await scoreStore.remove(record.key);
      });
      await refresh();
    } catch { setError("Accepted scores could not be removed from this device."); }
    finally { setBusy(false); }
  }
  const visibleRecords = records.filter(r => r.owner === user?.uid);
  return <main id="main-content" className="workspace-main"><PageHeading title="Saved scores" eyebrow="Device outbox" description="A score is submitted only after a matching server receipt arrives." /><div className="connected-stack">
    {loading ? <p role="status">Loading your account…</p> : !user ? <Link className="button button-volt" href="/sign-in">Sign in to view your saved scores</Link> : <><label className="trust-device"><input type="checkbox" checked={trusted} onChange={e => { setTrusted(e.target.checked); if (!e.target.checked) setRecords([]); }} />Open my saved scores on this trusted device.</label>
      {trusted && <><div className="queue-controls"><button disabled={busy} onClick={synchronize} className="button button-volt">Sync queued scores</button><button disabled={busy || !visibleRecords.some(r => r.state === "acknowledged")} onClick={removeAcknowledged} className="button button-outline">Remove accepted device copies</button></div><p className="info-note">Pending, rejected and conflicting commands stay here for review. Removing an accepted device copy does not change the server’s score.</p>
      {visibleRecords.length === 0 ? <p>No saved scores for this event on this device.</p> : <section aria-label="Saved score commands">{visibleRecords.map(r => <article className="outbox-record" key={r.key}><h2>{r.entryId || r.command.crew_id}</h2><p className="sync-state">{r.state.toUpperCase()} · Revision {r.command.expected_revision} · {r.command.operation_id}</p><p>{r.message || "Saved on device"}</p>{r.receipt && <p className="sync-state">Server receipt: {r.receipt.receipt_id}</p>}{r.entryId && <Link className="text-link" href={`/console/${encodeURIComponent(eventId)}/judge/${encodeURIComponent(r.entryId)}`}>Open scorecard</Link>}</article>)}</section>}</>}
    </>}
    {(error || accountError) && <p className="form-error" role="alert">{error || accountError}</p>}
  </div></main>;
}
