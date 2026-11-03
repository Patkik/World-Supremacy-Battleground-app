"use client";

import { useCallback, useEffect, useState } from "react";
import { Arrow, PageHeading, Status } from "@/components/ui";
import { ApiError, connectedRequest } from "@/lib/connected-api";
import { useAccount } from "@/lib/account";
import type { IntegrationStatus } from "@/lib/hq-integration-status";

function configured(value: boolean) {
  return value
    ? <Status tone="volt">Configured</Status>
    : <Status tone="amber">Not configured</Status>;
}

function checkError(error: unknown) {
  if (error instanceof ApiError && error.status === 401) return "Your session expired. Sign in again to view integration status.";
  if (error instanceof ApiError && error.status === 403) return "Only an authorized Global HQ administrator can view integration status.";
  if (error instanceof ApiError && error.status === 503) return "The durable API or its database is unavailable. No integration status was returned.";
  return error instanceof Error ? error.message : "Integration status could not be loaded.";
}

export default function GlobalIntegrationsConfigPage() {
  const { user } = useAccount();
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const result = await connectedRequest<IntegrationStatus>("/v1/hq/integrations", undefined, "GET", user.uid);
      setStatus(result);
    } catch (cause) {
      setStatus(null);
      setError(checkError(cause));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { if (user) void refresh(); }, [refresh, user]);

  return <main id="main-content" className="workspace-main">
    <PageHeading
      eyebrow="Global HQ / server configuration"
      title="Integrations"
      description="Review safe configuration indicators and the API’s live database reachability. Secret values are never returned to this page."
      action={<button type="button" className="button button-outline" onClick={() => void refresh()} disabled={loading}>{loading ? "Refreshing…" : "Refresh status"} <Arrow /></button>}
    />

    {error && <section className="panel" role="alert"><p className="form-error">{error}</p><button type="button" className="button button-outline" onClick={() => void refresh()} disabled={loading}>Retry</button></section>}
    {loading && <p role="status">Checking authorized server status…</p>}
    {status && <>
      <section className="panel">
        <div className="panel-heading"><div><h2>Release gate</h2><p>The current service intentionally remains closed to production use.</p></div><Status tone={status.release_ready ? "volt" : "amber"}>{status.release_ready ? "Ready" : "Not release ready"}</Status></div>
        <p>Last checked {new Date(status.checked_at * 1000).toLocaleString()}.</p>
      </section>

      <section className="panel">
        <div className="panel-heading"><div><h2>Database</h2><p>Reachability is tested by the server during this request.</p></div><Status tone={status.database.reachable ? "volt" : "crimson"}>{status.database.reachable ? "Reachable" : "Unavailable"}</Status></div>
        <dl className="grid gap-4 sm:grid-cols-3">
          <div><dt className="eyebrow">Project</dt><dd>{status.database.project_id}</dd></div>
          <div><dt className="eyebrow">Storage mode</dt><dd>{status.database.storage_mode}</dd></div>
          <div><dt className="eyebrow">Release readiness</dt><dd>Not established by a connectivity check</dd></div>
        </dl>
      </section>

      <section className="panel">
        <div className="panel-heading"><div><h2>PayMongo</h2><p>Configuration is reported from the API environment. The provider endpoint is not pinged.</p></div><Status>Connectivity not checked</Status></div>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div><dt className="eyebrow">Checkout credentials</dt><dd>{configured(status.paymongo.checkout_configured)}</dd></div>
          <div><dt className="eyebrow">Webhook secret</dt><dd>{configured(status.paymongo.webhook_secret_configured)}</dd></div>
          <div><dt className="eyebrow">Expected mode</dt><dd>{status.paymongo.webhook_mode === "missing_or_invalid" ? "Missing or invalid" : status.paymongo.webhook_mode}</dd></div>
          <div><dt className="eyebrow">Webhook configuration</dt><dd>{configured(status.paymongo.webhook_ready)}</dd></div>
        </dl>
        <p className="mt-4 text-sm text-[var(--ink-muted)]">Configuration does not verify credentials with PayMongo or prove webhook delivery. Controlled provider checks remain a release requirement.</p>
      </section>

      <section className="panel">
        <div className="panel-heading"><div><h2>Private media</h2><p>These indicators report configuration presence, not successful upload or scanning.</p></div><Status>External connectivity not checked</Status></div>
        <dl className="grid gap-4 sm:grid-cols-3">
          <div><dt className="eyebrow">Storage bucket</dt><dd>{configured(status.private_media.storage_bucket_configured)}</dd></div>
          <div><dt className="eyebrow">Storage gateway</dt><dd>{configured(status.private_media.storage_gateway_configured)}</dd></div>
          <div><dt className="eyebrow">Malware scanner address</dt><dd>{configured(status.private_media.malware_scanner_configured)}</dd></div>
        </dl>
      </section>
    </>}

    {!loading && !error && !status && <section className="panel"><h2>No status available</h2><p>The server did not provide integration status.</p></section>}
  </main>;
}
