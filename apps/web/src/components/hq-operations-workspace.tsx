"use client";

import { useCallback, useEffect, useState } from "react";
import { Arrow, PageHeading, Status } from "@/components/ui";
import { ApiError, connectedRequest } from "@/lib/connected-api";
import { useAccount } from "@/lib/account";
import type { IntegrationStatus } from "@/lib/hq-integration-status";

type QueueSample = { pending_sampled: number; failed_sampled: number; unreadable_sampled: number; has_more: boolean };
type QueueHealth = { roster: QueueSample; publication: QueueSample; checked_at: number };

function messageFor(error: unknown) {
  if (error instanceof ApiError && error.status === 401) return "Your session expired. Sign in again to view platform status.";
  if (error instanceof ApiError && error.status === 403) return "Only an authorized Global HQ administrator can view platform status.";
  if (error instanceof ApiError && error.status === 503) return "The durable API or database is unavailable. No platform status was returned.";
  return error instanceof Error ? error.message : "Platform status could not be loaded.";
}

export function HqOperationsWorkspace() {
  const { user } = useAccount();
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [queue, setQueue] = useState<QueueHealth | null>(null);
  const [queueError, setQueueError] = useState("");

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    setQueueError("");
    try {
      const [statusResult, queueResult] = await Promise.allSettled([
        connectedRequest<IntegrationStatus>("/v1/hq/integrations", undefined, "GET", user.uid),
        connectedRequest<QueueHealth>("/v1/hq/notification-queue", undefined, "GET", user.uid),
      ]);
      if (statusResult.status === "fulfilled") setStatus(statusResult.value);
      else { setStatus(null); setError(messageFor(statusResult.reason)); }
      if (queueResult.status === "fulfilled") setQueue(queueResult.value);
      else { setQueue(null); setQueueError(messageFor(queueResult.reason)); }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { if (user) void refresh(); }, [refresh, user]);

  return <main id="main-content" className="workspace-main">
    <PageHeading
      eyebrow="Global HQ / read-only service status"
      title="Platform operations"
      description="Review the API’s current database reachability and release gate. This page does not change maintenance state or verify audit-ledger integrity."
      action={<button className="button button-outline" type="button" onClick={() => void refresh()} disabled={loading}>{loading ? "Refreshing…" : "Refresh status"} <Arrow /></button>}
    />
    {error && <section className="panel" role="alert"><p className="form-error">{error}</p><button className="button button-outline" type="button" disabled={loading} onClick={() => void refresh()}>Retry</button></section>}
    {loading && <p role="status">Checking authorized platform status…</p>}
    {queueError && <section className="panel" role="alert"><h2>Notification queue unavailable</h2><p className="form-error">{queueError}</p></section>}
    {queue && <section className="panel" aria-label="Notification queue">
      <div className="panel-heading"><div><h2>Notification delivery queue</h2><p>Pending local delivery jobs, sampled up to 100 per queue.</p></div><Status tone={queue.roster.failed_sampled || queue.publication.failed_sampled || queue.roster.unreadable_sampled || queue.publication.unreadable_sampled ? "amber" : "neutral"}>Read only</Status></div>
      <div className="grid gap-4 md:grid-cols-2">{([ ["Roster delivery", queue.roster], ["Published result expansion", queue.publication] ] as const).map(([label, sample]) => <article key={label}><h3>{label}</h3><p>{sample.has_more ? "At least " : ""}{sample.pending_sampled} pending · {sample.failed_sampled} sampled jobs have a recorded failed attempt</p>{sample.unreadable_sampled > 0 && <p className="form-error">{sample.unreadable_sampled} sampled jobs have unreadable failure metadata.</p>}{sample.has_more && <p className="fineprint">More jobs exist beyond this sample; failures outside it are not counted.</p>}</article>)}</div>
      <p className="fineprint">Workers retry automatically. Completed jobs leave the queue, and failure recording can be unavailable during a database outage or for malformed jobs. This is not a delivery history. Checked {new Date(queue.checked_at * 1000).toLocaleString()}.</p>
    </section>}
    {status && <>
      <section className="grid gap-4 md:grid-cols-3">
        <article className="panel"><p className="eyebrow">API status request</p><h2>Responding</h2><p>The authorized HQ status request completed.</p></article>
        <article className="panel"><p className="eyebrow">Firestore</p><h2>{status.database.reachable ? "Reachable" : "Unavailable"}</h2><p>{status.database.project_id} · {status.database.storage_mode}</p><Status tone={status.database.reachable ? "volt" : "crimson"}>{status.database.reachable ? "Reachable" : "Unavailable"}</Status></article>
        <article className="panel"><p className="eyebrow">Release gate</p><h2>{status.release_ready ? "Ready" : "Closed"}</h2><p>Database connectivity alone does not establish release readiness.</p><Status tone={status.release_ready ? "volt" : "amber"}>{status.release_ready ? "Ready" : "Not release ready"}</Status></article>
      </section>
      <section className="panel">
        <div className="panel-heading"><div><h2>Operational controls</h2><p>Service health and change controls are separate capabilities.</p></div><Status tone="amber">Not available</Status></div>
        <p>Maintenance mode, deployment controls, ledger verification, alert delivery and incident response are not connected here. No maintenance state was changed.</p>
        <p className="fineprint">Status checked {new Date(status.checked_at * 1000).toLocaleString()}.</p>
      </section>
    </>}
    {!loading && !error && !status && <section className="panel"><h2>No platform status</h2><p>The server did not provide current status.</p></section>}
  </main>;
}
