"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Arrow, PageHeading, Status } from "@/components/ui";
import { useAccount } from "@/lib/account";
import { ApiError, connectedRequest } from "@/lib/connected-api";
import { isIntegrationStatus, type IntegrationStatus } from "@/lib/hq-integration-status";

type QueueSample = {
  pending_sampled: number;
  failed_sampled: number;
  unreadable_sampled: number;
  has_more: boolean;
};
type QueueHealth = { roster: QueueSample; publication: QueueSample; checked_at: number };
type OverviewCounts = { chapters: { total: number }; events: { total: number }; checked_at: number };

function isOverviewCounts(value: unknown): value is OverviewCounts {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  const chapters = row.chapters as Record<string, unknown> | undefined;
  const events = row.events as Record<string, unknown> | undefined;
  return Number.isSafeInteger(row.checked_at) && Number(row.checked_at) > 0
    && !!chapters && Number.isSafeInteger(chapters.total) && Number(chapters.total) >= 0
    && !!events && Number.isSafeInteger(events.total) && Number(events.total) >= 0
    && row.chapter_health === "unavailable"
    && row.approved_global_publications === "unavailable";
}

function isQueueSample(value: unknown): value is QueueSample {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return ["pending_sampled", "failed_sampled", "unreadable_sampled"].every(key =>
    Number.isSafeInteger(row[key]) && Number(row[key]) >= 0,
  ) && typeof row.has_more === "boolean";
}

function isQueueHealth(value: unknown): value is QueueHealth {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return Number.isSafeInteger(row.checked_at) && Number(row.checked_at) > 0
    && isQueueSample(row.roster) && isQueueSample(row.publication);
}

function messageFor(error: unknown) {
  if (error instanceof ApiError && error.status === 401) return "Your session expired. Sign in again to view the Global HQ overview.";
  if (error instanceof ApiError && error.status === 403) return "Only a current Global HQ administrator can view these platform signals.";
  if (error instanceof ApiError && error.status === 503) return "The durable API or database is unavailable. No current status was returned.";
  return error instanceof Error ? error.message : "The Global HQ overview could not be loaded.";
}

export function HqOverviewWorkspace() {
  const { user, loading } = useAccount();
  if (loading) return <main className="workspace-main"><PageHeading eyebrow="Global HQ" title="Platform overview" description="Checking the current signed-in account." /><p role="status">Loading account…</p></main>;
  if (!user) return <main className="workspace-main"><PageHeading eyebrow="Global HQ" title="Platform overview unavailable" description="Sign in with an authorized Global HQ account to load live platform signals." /></main>;
  return <HqOverviewSnapshot key={user.uid} uid={user.uid} />;
}

function HqOverviewSnapshot({ uid }: { uid: string }) {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [statusError, setStatusError] = useState("");
  const [queue, setQueue] = useState<QueueHealth | null>(null);
  const [queueError, setQueueError] = useState("");
  const [counts, setCounts] = useState<OverviewCounts | null>(null);
  const [countsError, setCountsError] = useState("");
  const [loading, setLoading] = useState(true);
  const generation = useRef(0);

  const refresh = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true);
    setStatusError("");
    setQueueError("");
    setCountsError("");
    const [statusResult, queueResult, countsResult] = await Promise.allSettled([
      connectedRequest<unknown>("/v1/hq/integrations", undefined, "GET", uid),
      connectedRequest<unknown>("/v1/hq/notification-queue", undefined, "GET", uid),
      connectedRequest<unknown>("/v1/hq/overview", undefined, "GET", uid),
    ]);
    if (request !== generation.current) return;
    if (statusResult.status === "fulfilled" && isIntegrationStatus(statusResult.value)) {
      setStatus(statusResult.value);
    } else {
      setStatus(null);
      setStatusError(statusResult.status === "rejected" ? messageFor(statusResult.reason) : "The platform status response was incomplete.");
    }
    if (queueResult.status === "fulfilled" && isQueueHealth(queueResult.value)) {
      setQueue(queueResult.value);
    } else {
      setQueue(null);
      setQueueError(queueResult.status === "rejected" ? messageFor(queueResult.reason) : "The operational exception sample was incomplete.");
    }
    if (countsResult.status === "fulfilled" && isOverviewCounts(countsResult.value)) {
      setCounts(countsResult.value);
    } else {
      setCounts(null);
      setCountsError(countsResult.status === "rejected" ? messageFor(countsResult.reason) : "The platform aggregate response was incomplete.");
    }
    setLoading(false);
  }, [uid]);

  useEffect(() => {
    void refresh();
    return () => { generation.current++; };
  }, [refresh]);

  const hasExceptions = !!queue && [queue.roster, queue.publication].some(sample =>
    sample.failed_sampled > 0 || sample.unreadable_sampled > 0,
  );

  return <main id="main-content" className="workspace-main">
    <PageHeading
      eyebrow="Global HQ / live overview"
      title="Platform overview"
      description="Current service signals and Firestore document totals from the authorized API. Chapter health and approved global publications remain unavailable."
      action={<button className="button button-outline" type="button" onClick={() => void refresh()} disabled={loading}>{loading ? "Refreshing…" : "Refresh overview"} <Arrow /></button>}
    />

    <section className="panel connected-stack" aria-labelledby="platform-signals-heading">
      <div className="panel-heading"><div><p className="eyebrow">Live checks</p><h2 id="platform-signals-heading">Platform dependencies</h2></div><Status tone={loading && !status ? "neutral" : statusError || !status?.database.reachable ? "amber" : "volt"}>{loading && !status ? "Checking" : status?.database.reachable ? "Database reachable" : "Unavailable"}</Status></div>
      {statusError && <p role="alert" className="form-error">{statusError}</p>}
      {loading && !status && <p role="status">Checking current API and database status…</p>}
      {status && <div className="grid gap-5 md:grid-cols-[minmax(0,1.4fr)_minmax(16rem,1fr)]">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div><dt className="eyebrow">API</dt><dd className="text-xl font-semibold">Responding</dd><p className="fineprint">This signed Global HQ request completed.</p></div>
          <div><dt className="eyebrow">Firestore</dt><dd className="text-xl font-semibold">{status.database.reachable ? "Reachable" : "Unavailable"}</dd><p className="fineprint">{status.database.project_id} · {status.database.storage_mode}</p></div>
          <div><dt className="eyebrow">Release gate</dt><dd className="text-xl font-semibold">{status.release_ready ? "Ready" : "Closed"}</dd><p className="fineprint">Connectivity alone does not establish release readiness.</p></div>
          <div><dt className="eyebrow">Provider checks</dt><dd className="text-xl font-semibold">Not checked</dd><p className="fineprint">PayMongo, Storage and ClamAV connectivity is not probed here.</p></div>
        </dl>
        <aside className="border border-subtle p-5" aria-label="Global data coverage">
          <p className="eyebrow">Data coverage</p>
          <h3>Directory and publishing</h3>
          <p>Saved chapter names and currencies are available in the directory.</p>
          {countsError && <p role="alert" className="form-error">{countsError}</p>}
          {counts && <p>{counts.chapters.total} chapters · {counts.events.total} events</p>}
          {!counts && !countsError && <p role="status">Loading platform totals…</p>}
          <p>These are separate exact document counts, not a consistent snapshot. Chapter health and approved global publications have no authoritative feed.</p>
          <Link className="text-link" href="/hq/chapters">Open chapter directory <Arrow /></Link>
        </aside>
        <p className="fineprint sm:col-span-2">Status checked {new Date(status.checked_at * 1000).toLocaleString()}.</p>
      </div>}
      {!loading && !status && !statusError && <p role="status">No current platform status is available.</p>}
    </section>

    <section className="panel connected-stack" aria-labelledby="operational-exceptions-heading">
      <div className="panel-heading"><div><p className="eyebrow">Read-only sample</p><h2 id="operational-exceptions-heading">Operational exceptions</h2></div><Status tone={hasExceptions ? "amber" : "neutral"}>{hasExceptions ? "Failures in sample" : "Sample only"}</Status></div>
      {queueError && <p role="alert" className="form-error">{queueError}</p>}
      {loading && !queue && <p role="status">Loading the bounded notification queue sample…</p>}
      {queue && <>
        <div className="grid gap-4 md:grid-cols-2">{([ ["Roster delivery", queue.roster], ["Published result expansion", queue.publication] ] as const).map(([label, sample]) => <article key={label} className="border border-subtle p-5">
          <h3>{label}</h3>
          <p>{sample.has_more ? "At least " : ""}{sample.pending_sampled} pending · {sample.failed_sampled} sampled failures</p>
          {sample.unreadable_sampled > 0 && <p className="form-error">{sample.unreadable_sampled} sampled records have unreadable failure details.</p>}
          {sample.has_more && <p className="fineprint">More jobs exist beyond this bounded sample.</p>}
        </article>)}</div>
        <p className="fineprint">Completed jobs leave the queue. Outages and malformed jobs can prevent failures from being recorded, so this is not a complete incident history. Checked {new Date(queue.checked_at * 1000).toLocaleString()}.</p>
        <Link className="text-link" href="/hq/operations">Open operations details <Arrow /></Link>
      </>}
      {!loading && !queue && !queueError && <p role="status">No current exception sample is available.</p>}
    </section>

    <section aria-label="Global HQ workspaces" className="connected-stack">
      <div><p className="eyebrow">Governance and chapter workspaces</p><h2>Open a workspace</h2></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[
          { title: "Chapter access", path: "/hq/access", description: "Manage reasoned, audited chapter staff access.", state: "Connected" },
          { title: "Applications", path: "/hq/applications", description: "Read private proposals and request follow-up; no affiliation decisions.", state: "Connected" },
          { title: "Chapter directory", path: "/hq/chapters", description: "Read saved chapter names and currency codes.", state: "Read only" },
          { title: "Rules library", path: "/hq/rules", description: "Review open policy gates; global publication is not connected.", state: "Preview" },
          { title: "Global content", path: "/hq/content", description: "Global publishing has no durable content service.", state: "Preview" },
          { title: "Integrations", path: "/hq/integrations", description: "Inspect safe configuration indicators and database reachability.", state: "Read only" },
          { title: "Operations", path: "/hq/operations", description: "Review database and notification delivery signals.", state: "Read only" },
        ].map(workspace => <Link key={workspace.path} href={workspace.path} className="panel connected-stack hover:border-volt focus-visible:outline focus-visible:outline-2">
          <div className="flex items-center justify-between gap-3"><h3>{workspace.title}</h3><Status tone={workspace.state === "Preview" ? "amber" : "volt"}>{workspace.state}</Status></div>
          <p>{workspace.description}</p><span className="text-link">Open workspace <Arrow /></span>
        </Link>)}
      </div>
    </section>
    <p className="fineprint">Global HQ accounts are provisioned through a trusted administrative process. Chapter access tools do not create accounts or change Global HQ membership.</p>
  </main>;
}
