"use client";
import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { Arrow, Brand, PageHeading, Status } from "@/components/ui";
import { useWorkspaceSession } from "@/lib/account";
import { ApiError, connectedPage, segment } from "@/lib/connected-api";

type DivisionStatus = {
  id: string;
  name: string;
  locked: boolean;
  publication_id: string | null;
  approved_entries: number;
  unready_entries: number;
  completed_scorecards: number;
  panel_count: number;
};

function Desk({ eventId, chapter, uid }: { eventId: string; chapter: string; uid: string }) {
  const [divisions, setDivisions] = useState<DivisionStatus[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const base = `/v1/chapters/${segment(chapter)}/events/${segment(eventId)}`;

  const load = useCallback(async (next?: string | null) => {
    setLoading(true); setError("");
    try {
      const page = await connectedPage<DivisionStatus>(`${base}/division-status`, next, uid);
      if (!Array.isArray(page.items) || page.items.length > 100 || page.items.some(row => !row || typeof row.id !== "string" || !row.id || typeof row.name !== "string" || !row.name || typeof row.locked !== "boolean" || !(row.publication_id === null || typeof row.publication_id === "string") || [row.approved_entries, row.unready_entries, row.completed_scorecards, row.panel_count].some(value => !Number.isSafeInteger(value) || value < 0) || row.panel_count > 20 || !Number.isSafeInteger(row.approved_entries * row.panel_count)) || new Set(page.items.map(row => row.id)).size !== page.items.length || !(page.next_page === null || (typeof page.next_page === "string" && !!page.next_page && page.next_page.length <= 4096 && page.next_page !== next))) throw new Error("Division status could not be verified. Refresh before continuing.");
      setDivisions(current => next ? [...current, ...page.items.filter(row => !current.some(existing => existing.id === row.id))] : page.items);
      setCursor(page.next_page);
    } catch (reason) { if (reason instanceof ApiError && [401, 403].includes(reason.status)) { setDivisions([]); setCursor(null); } setError(reason instanceof Error ? reason.message : "Unable to load division status."); }
    finally { setLoading(false); }
  }, [base, uid]);
  useEffect(() => { void load(); }, [load]);

  return <div className="connected-stack">
    {loading && divisions.length === 0 ? <p role="status">Loading divisions…</p>
      : error ? <p role="alert" className="form-error">{error}</p>
        : divisions.length === 0 ? <p>No divisions are configured for this event.</p>
          : <ul className="connected-list">
            {divisions.map(division => {
              const required = division.approved_entries * division.panel_count;
              const complete = division.panel_count > 0 && division.approved_entries > 0 && division.unready_entries === 0 && division.completed_scorecards === required;
              return <li key={division.id} className="panel">
                <div className="panel-heading"><div><h2>{division.name}</h2><p className="mono">{division.id}</p></div><Status tone={division.locked ? "volt" : complete ? "volt" : "amber"}>{division.locked ? "Locked" : complete ? "Complete" : "Incomplete"}</Status></div>
                <p>{division.approved_entries} approved entries · {division.completed_scorecards} of {required} scorecards · {division.unready_entries} unready · panel of {division.panel_count}</p>
                {division.publication_id && <p className="fineprint">Published as {division.publication_id}</p>}
                <Link href={`/console/${segment(eventId)}/head-judge/${segment(division.id)}`} className="button button-outline">Open division review <Arrow /></Link>
              </li>;
            })}
          </ul>}
    {cursor && <button type="button" className="button button-outline" disabled={loading} onClick={() => void load(cursor)}>Load more divisions</button>}
    {error && divisions.length > 0 && <p role="alert" className="form-error">{error}</p>}
    <button type="button" className="button button-outline" disabled={loading} onClick={() => void load()}>Refresh division status</button>
  </div>;
}

export default function HeadJudgeOverviewPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const { session, loading, error } = useWorkspaceSession();
  return <div className="judge-shell"><header className="judge-header"><Brand /><div className="judge-event"><strong>Head judge desk</strong><span>Event {eventId}</span></div><Link href="/console" className="text-link">Console hub</Link></header><main id="main-content" className="workspace-main"><PageHeading title="Division review" description="Review panel completeness before locking a division. Publication is a separate authorized step at the chapter publication desk." />{loading ? <p role="status">Checking access…</p> : !session ? <p role="alert">{error || "Sign in to continue."} <Link href={`/sign-in?next=${segment(`/console/${segment(eventId)}/head-judge`)}`}>Sign in</Link></p> : !["head_judge", "chapter_director"].includes(session.role) ? <p role="alert">Your account does not have head-judge access for this event.</p> : <Desk key={JSON.stringify([session.chapter_id, session.uid, session.role, eventId])} chapter={session.chapter_id} uid={session.uid} eventId={eventId} />}</main></div>;
}
