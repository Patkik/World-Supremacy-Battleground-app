"use client";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useAccount } from "@/lib/account";
import { scoreStore, synchronizeScores } from "@/lib/judging/sync";
import type { ScoreOperation } from "@/lib/judging/outbox";
import { PageHeading } from "./ui";

export function ScoreOutbox({ eventId }: { eventId: string }) {
  const { user, loading, error: accountError } = useAccount();
  const [records, setRecords] = useState<ScoreOperation[]>([]);
  const [trusted, setTrusted] = useState(false);
  const trustedRef = useRef(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const scopeKey = `${user?.uid ?? "signed-out"}/${eventId}`;
  const priorScope = useRef(scopeKey);
  const scopeGeneration = useRef(0);
  useLayoutEffect(() => {
    if (priorScope.current === scopeKey) return;
    priorScope.current = scopeKey;
    ++scopeGeneration.current;
    trustedRef.current = false;
    setRecords([]); setTrusted(false); setError(""); setBusy(false);
  }, [scopeKey]);
  const refresh = useCallback(async () => {
    if (!user || !trusted || !trustedRef.current || priorScope.current !== scopeKey) return;
    const generation = scopeGeneration.current;
    const records = await scoreStore.list(user.uid);
    if (generation === scopeGeneration.current && priorScope.current === scopeKey) setRecords(records.filter(r => r && typeof r === "object" && r.event === eventId));
  }, [user, trusted, eventId, scopeKey]);
  useEffect(() => { refresh().catch(() => setError("Unable to open device storage.")); }, [refresh]);
  async function synchronize() {
    if (!user || priorScope.current !== scopeKey) return;
    const generation = scopeGeneration.current;
    setBusy(true); setError("");
    try { await synchronizeScores(user.uid); if (generation === scopeGeneration.current && priorScope.current === scopeKey) await refresh(); }
    catch (reason) { if (generation === scopeGeneration.current && priorScope.current === scopeKey) setError(reason instanceof Error ? reason.message : "Unable to sync scores."); }
    finally { if (generation === scopeGeneration.current && priorScope.current === scopeKey) setBusy(false); }
  }
  async function removeAcknowledged() {
    if (!user || !navigator.locks || priorScope.current !== scopeKey) return;
    const generation = scopeGeneration.current;
    setBusy(true); setError("");
    try {
      await navigator.locks.request(`wsb-score-sync:${user.uid}`, async () => {
        const saved = await scoreStore.list(user.uid);
        for (const record of saved.filter(r => r.event === eventId && r.state === "acknowledged")) await scoreStore.remove(record.key);
      });
      if (generation === scopeGeneration.current && priorScope.current === scopeKey) await refresh();
    } catch { if (generation === scopeGeneration.current && priorScope.current === scopeKey) setError("Accepted scores could not be removed from this device."); }
    finally { if (generation === scopeGeneration.current && priorScope.current === scopeKey) setBusy(false); }
  }
  const visibleRecords = records.filter(r => r.owner === user?.uid);
  return <main id="main-content" className="workspace-main"><PageHeading title="Saved scores" eyebrow="Device outbox" description="A score is submitted only after a matching server receipt arrives." /><div className="connected-stack">
      {loading ? <p role="status">Loading your account…</p> : !user ? <Link className="button button-volt" href="/sign-in">Sign in to view your saved scores</Link> : <><label className="trust-device"><input type="checkbox" checked={trusted} onChange={e => { trustedRef.current = e.target.checked; setTrusted(e.target.checked); if (!e.target.checked) setRecords([]); }} />Open my saved scores on this trusted device.</label>
      {trusted && <><div className="queue-controls"><button disabled={busy} onClick={synchronize} className="button button-volt">Sync queued scores</button><button disabled={busy || !visibleRecords.some(r => r.state === "acknowledged")} onClick={removeAcknowledged} className="button button-outline">Remove accepted device copies</button></div><p className="info-note">Pending, rejected and conflicting commands stay here for review. Removing an accepted device copy does not change the server’s score.</p>
        {visibleRecords.length === 0 ? <p>No saved scores for this event on this device.</p> : <section aria-label="Saved score commands">{visibleRecords.map((r, index) => {
          const command = r && typeof r.command === "object" && r.command !== null ? r.command : undefined;
          const entryId = typeof r.entryId === "string" && r.entryId.length > 0 ? r.entryId : undefined;
          const crewId = typeof command?.crew_id === "string" && command.crew_id.length > 0 ? command.crew_id : undefined;
          const operationId = typeof command?.operation_id === "string" && command.operation_id.length > 0 ? command.operation_id : undefined;
          const revision = command && Number.isSafeInteger(command.expected_revision) ? command.expected_revision : undefined;
          const validState = ["draft", "queued", "sending", "acknowledged", "conflict", "rejected"].includes(r?.state);
          const stateLabel = validState ? r.state.toUpperCase() : "UNREADABLE";
          const key = typeof r.key === "string" && r.key.length > 0 ? r.key : `unreadable-${index}`;
          const message = typeof r.message === "string" && r.message.length > 0 ? r.message : validState ? "Saved on device" : "This local record could not be verified. It was not sent; keep it for review.";
          const receiptId = r.receipt && typeof r.receipt.receipt_id === "string" ? r.receipt.receipt_id : undefined;
          return <article className="outbox-record" key={key}><h2>{entryId || crewId || "Unrecognized saved command"}</h2><p className="sync-state">{stateLabel}{revision === undefined ? "" : ` · Revision ${revision}`}{operationId ? ` · ${operationId}` : ""}</p><p>{message}</p>{receiptId && <p className="sync-state">Server receipt: {receiptId}</p>}{entryId && <Link className="text-link" href={`/console/${encodeURIComponent(eventId)}/judge/${encodeURIComponent(entryId)}`}>Open scorecard</Link>}</article>;
        })}</section>}</>}
    </>}
    {(error || accountError) && <p className="form-error" role="alert">{error || accountError}</p>}
  </div></main>;
}
