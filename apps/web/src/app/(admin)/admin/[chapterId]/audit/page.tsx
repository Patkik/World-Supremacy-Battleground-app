"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Arrow, PageHeading, Status } from "@/components/ui";
import { useWorkspaceSession } from "@/lib/account";
import { ApiError, connectedRequest, segment } from "@/lib/connected-api";

type AuditRecord = {
  id: string;
  actor_uid: string;
  chapter_id: string;
  action: string;
  resource_id: string;
  recorded_at: number;
  reason: string | null;
  correlation_id: string | null;
};
type AuditPage = { items: AuditRecord[]; next_page: string | null };

function isAuditRecord(value: unknown, chapterId: string): value is AuditRecord {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<AuditRecord>;
  return typeof row.id === "string" && row.id.length > 0 && row.id.length <= 200
    && typeof row.actor_uid === "string" && row.actor_uid.length > 0 && row.actor_uid.length <= 200
    && row.chapter_id === chapterId
    && typeof row.action === "string" && row.action.length > 0 && row.action.length <= 200
    && typeof row.resource_id === "string" && row.resource_id.length <= 200
    && Number.isSafeInteger(row.recorded_at) && (row.recorded_at ?? 0) > 0
    && (row.reason == null || (typeof row.reason === "string" && row.reason.length <= 1000))
    && (row.correlation_id == null || (typeof row.correlation_id === "string" && row.correlation_id.length <= 200));
}

function isAuditPage(value: unknown, chapterId: string): value is AuditPage {
  if (!value || typeof value !== "object") return false;
  const page = value as Partial<AuditPage>;
  if (!Array.isArray(page.items) || page.items.length > 100
    || !page.items.every(row => isAuditRecord(row, chapterId))
    || !(page.next_page == null || (typeof page.next_page === "string" && page.next_page.length > 0 && page.next_page.length <= 4096))) return false;
  return new Set(page.items.map(row => row.id)).size === page.items.length;
}

function dateLabel(seconds: number) {
  const date = new Date(seconds * 1000);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : "Invalid saved timestamp";
}

function auditError(error: unknown) {
  if (error instanceof ApiError && error.status === 401) return "Your session expired. Sign in again to view the audit history.";
  if (error instanceof ApiError && error.status === 403) return "Audit history is available to active chapter directors and auditors for this chapter.";
  if (error instanceof ApiError && error.status === 501) return "Durable audit storage is not enabled in this environment.";
  if (error instanceof ApiError && error.status === 503) return "Audit storage is unavailable. Retry when the service is available.";
  return error instanceof Error ? error.message : "Unable to load chapter audit records.";
}

export default function ChapterAuditPage({ params }: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = use(params);
  const { session, loading: sessionLoading, error: sessionError } = useWorkspaceSession(chapterId);
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [actorFilter, setActorFilter] = useState("");
  const [resourceFilter, setResourceFilter] = useState("");
  const generation = useRef(0);
  const consumedCursors = useRef(new Set<string>());
  const allowed = !!session && session.chapter_id === chapterId && ["chapter_director", "auditor"].includes(session.role);
  const uid = session?.uid;

  const load = useCallback(async (next?: string | null) => {
    if (!uid || !allowed) return;
    const requestGeneration = ++generation.current;
    setLoading(true);
    setError("");
    try {
      const suffix = next ? `?cursor=${segment(next)}&limit=30` : "?limit=30";
      const response = await connectedRequest<unknown>(
        `/v1/chapters/${segment(chapterId)}/audit${suffix}`,
        undefined,
        "GET",
        uid,
      );
      if (!isAuditPage(response, chapterId)) throw new Error("The audit service returned a malformed or out-of-chapter page. Refresh before continuing.");
      const page = response;
      if (requestGeneration === generation.current) {
        if (next && (consumedCursors.current.has(next) || page.next_page === next || (page.next_page && consumedCursors.current.has(page.next_page)))) throw new Error("The audit continuation repeated. Refresh before continuing.");
        if (next) consumedCursors.current.add(next); else consumedCursors.current.clear();
        setRecords(current => {
          if (!next) return page.items;
          const seen = new Set(current.map(record => record.id));
          const additions = page.items.filter(record => {
            if (seen.has(record.id)) return false;
            seen.add(record.id);
            return true;
          });
          return [...current, ...additions];
        });
        setCursor(page.next_page);
      }
    } catch (cause) {
      if (requestGeneration === generation.current) {
        if (cause instanceof ApiError && (cause.status === 401 || cause.status === 403)) {
          setRecords([]);
          setCursor(null);
        }
        setError(auditError(cause));
      }
    } finally {
      if (requestGeneration === generation.current) setLoading(false);
    }
  }, [allowed, chapterId, uid]);

  // Scan a bounded batch using the same authorized page API, including legacy records.
  const scanMore = async () => {
    if (!uid || !allowed || !cursor || loading) return;
    const requestGeneration = ++generation.current;
    let next: string | null = cursor;
    setLoading(true); setError("");
    try {
      for (let pageNumber = 0; pageNumber < 10 && next; pageNumber++) {
        if (consumedCursors.current.has(next)) throw new Error("The audit continuation repeated. Refresh before continuing.");
        const response: unknown = await connectedRequest(`/v1/chapters/${segment(chapterId)}/audit?cursor=${segment(next)}&limit=30`, undefined, "GET", uid);
        if (!isAuditPage(response, chapterId)) throw new Error("The audit service returned a malformed or out-of-chapter page. Refresh before continuing.");
        if (requestGeneration !== generation.current) return;
        if (response.next_page === next || (response.next_page && consumedCursors.current.has(response.next_page))) throw new Error("The audit continuation repeated. Refresh before continuing.");
        consumedCursors.current.add(next);
        setRecords(current => {
          const seen = new Set(current.map(record => record.id));
          return [...current, ...response.items.filter(record => !seen.has(record.id) && !!seen.add(record.id))];
        });
        next = response.next_page;
        setCursor(next);
      }
    } catch (cause) {
      if (requestGeneration === generation.current) {
        if (cause instanceof ApiError && (cause.status === 401 || cause.status === 403)) { setRecords([]); setCursor(null); }
        setError(auditError(cause));
      }
    } finally { if (requestGeneration === generation.current) setLoading(false); }
  };

  useEffect(() => {
    setRecords([]);
    setCursor(null);
    consumedCursors.current.clear();
    setActionFilter("all");
    setActorFilter("");
    setResourceFilter("");
    if (allowed) void load();
    return () => { generation.current += 1; };
  }, [allowed, load]);

  const actions = useMemo(() => [...new Set(records.map(record => record.action))].sort(), [records]);
  const visibleRecords = records.filter(record =>
    (actionFilter === "all" || record.action === actionFilter)
    && record.actor_uid.toLocaleLowerCase().includes(actorFilter.trim().toLocaleLowerCase())
    && record.resource_id.toLocaleLowerCase().includes(resourceFilter.trim().toLocaleLowerCase()));

  const exportLoaded = () => {
    const content = JSON.stringify({ chapter_id: chapterId, scope: "currently_loaded_records", records: visibleRecords }, null, 2);
    const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `chapter-${chapterId}-audit-loaded.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return <main id="main-content" className="workspace-main">
    <PageHeading
      eyebrow={`Chapter records / ${chapterId}`}
      title="Audit history"
      description="Read durable chapter audit records. Newest recorded activity appears first."
      action={<a href={`/admin/${segment(chapterId)}`} className="button button-outline">Chapter workspace <Arrow /></a>}
    />
    {sessionLoading ? <p role="status">Checking chapter access…</p>
      : !session ? <p role="alert" className="form-error">{sessionError || "Sign in with your chapter account to continue."}</p>
        : !allowed ? <p role="alert" className="form-error">Audit history is available to the active chapter director or auditor for this chapter.</p>
          : <>
            <section className="panel" aria-label="Audit history controls">
              <div className="panel-heading"><div><h2>Saved records</h2><p>Showing {visibleRecords.length} of {records.length} loaded records. More records may be available on later pages.</p></div><Status tone="neutral">Read only</Status></div>
              <div className="flex flex-wrap items-end gap-3">
                <label className="form-field"><span>Filter loaded records by action</span><select className="input" value={actionFilter} onChange={event => setActionFilter(event.target.value)}><option value="all">All actions</option>{actions.map(action => <option key={action} value={action}>{action}</option>)}</select></label>
                <label className="form-field"><span>Actor account ID</span><input className="input" value={actorFilter} maxLength={200} onChange={event => setActorFilter(event.target.value)} /></label>
                <label className="form-field"><span>Resource ID</span><input className="input" value={resourceFilter} maxLength={200} onChange={event => setResourceFilter(event.target.value)} /></label>
                <button type="button" className="button button-outline" disabled={loading} onClick={() => void load()}>Refresh</button>
                <button type="button" className="button button-outline" disabled={!visibleRecords.length} onClick={exportLoaded}>Export loaded records</button>
              </div>
              <p className="mt-3 text-sm text-[var(--ink-muted)]">Export includes only records currently loaded on this page set and matching the selected filters.</p>
            </section>
            {error && <section className="panel" role="alert"><p className="form-error">{error}</p><button type="button" className="button button-outline" onClick={() => void load(error.includes("continuation repeated") ? null : cursor)}>Retry</button></section>}
            {loading && <div role="status"><p>Loading chapter audit records…</p><button type="button" className="button button-outline" onClick={() => { generation.current += 1; setLoading(false); }}>Stop loading</button></div>}
            {!loading && !error && visibleRecords.length === 0 && <section className="panel"><h2>{records.length ? "No matching records" : "No audit records"}</h2><p>{records.length ? "No loaded records match these filters. Change or clear them to see more loaded records." : "Durable audit records for this chapter will appear here when available."}</p></section>}
            <div className="connected-stack" aria-live="polite">
              {visibleRecords.map(record => <article key={record.id} className="panel">
                <div className="panel-heading"><div><h2>{record.action}</h2><p>{dateLabel(record.recorded_at)}</p></div><Status>{record.resource_id ? "Resource recorded" : "Resource not recorded"}</Status></div>
                <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div><dt className="eyebrow">Actor UID</dt><dd className="break-all font-mono">{record.actor_uid}</dd></div>
                  <div><dt className="eyebrow">Resource ID</dt><dd className="break-all font-mono">{record.resource_id || "Not recorded"}</dd></div>
                  <div><dt className="eyebrow">Record ID</dt><dd className="break-all font-mono">{record.id}</dd></div>
                  <div><dt className="eyebrow">Reason</dt><dd>{record.reason || "Not recorded"}</dd></div>
                  <div><dt className="eyebrow">Correlation ID</dt><dd className="break-all font-mono">{record.correlation_id || "Not recorded"}</dd></div>
                </dl>
              </article>)}
            </div>
            {cursor && !loading && !error && <div className="connected-actions"><button type="button" className="button button-outline" onClick={() => void load(cursor)}>Load more records</button><button type="button" className="button button-outline" onClick={() => void scanMore()}>Search next 10 pages</button></div>}
            <p className="fineprint">Filters search the loaded records. Search next 10 pages adds up to 300 records per request batch. Continue until no more pages remain to search the available archive; exports contain only loaded matching records.</p>
          </>}
  </main>;
}
