"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useWorkspaceSession } from "@/lib/account";
import { resolveApiBase } from "@/lib/api";
import { connectedPage, connectedRequest, segment } from "@/lib/connected-api";
import { Arrow, Button, PageHeading, Status } from "./ui";

type Division = {
  id: string;
  name: string;
  min_members: number;
  max_members: number;
  max_duration_secs: number;
  locked: boolean;
  publication_id: string | null;
  approved_entries: number;
  unready_entries: number;
};

type PublishedSnapshot = {
  publication_id: string;
  chapter_id: string;
  event_id: string;
  division_id: string;
  published_at: number;
  digest: string;
  results: { entry_id: string; crew_id: string; raw_average: number; total_deductions: number; final_score: number; rank: number }[];
};

function publicationConflictMessage() {
  return "Publication did not complete. Check the division lock, panel scores, unresolved ties, and public event ID before retrying.";
}

function validPublicationCollection(value: unknown, chapterId: string, eventId: string): value is PublishedSnapshot[] {
  if (!Array.isArray(value) || value.some(item => item.event_id !== eventId || item.chapter_id !== chapterId || typeof item.publication_id !== "string" || !item.publication_id || typeof item.division_id !== "string" || !item.division_id || typeof item.digest !== "string" || !/^[a-f0-9]{64}$/i.test(item.digest) || !Number.isSafeInteger(item.published_at) || !Array.isArray(item.results) || item.results.some((result: PublishedSnapshot["results"][number]) => !result || typeof result.entry_id !== "string" || !result.entry_id || typeof result.crew_id !== "string" || !result.crew_id || ![result.final_score, result.raw_average, result.total_deductions].every(Number.isFinite) || result.raw_average < 0 || result.raw_average > 100 || result.total_deductions < 0 || result.final_score < 0 || result.final_score > 100 || !Number.isSafeInteger(result.rank) || result.rank < 1))) return false;
  const divisions = new Set<string>();
  const publicationIds = new Set<string>();
  const entryIds = new Set<string>();
  for (const item of value) {
    if (divisions.has(item.division_id) || publicationIds.has(item.publication_id)) return false;
    divisions.add(item.division_id);
    publicationIds.add(item.publication_id);
    for (const result of item.results) {
      if (entryIds.has(result.entry_id)) return false;
      entryIds.add(result.entry_id);
    }
  }
  return true;
}

export function ConnectedResultsPublication({
  chapterId,
  eventId,
}: {
  chapterId: string;
  eventId: string;
}) {
  const { session, loading, error: accountError } = useWorkspaceSession(chapterId);
  if (loading) return <main id="main-content" className="section-wrap space-y-8"><PageHeading title="Results publication" description="Check current chapter access before reviewing publication status."/><p role="status">Checking your chapter access…</p></main>;
  if (!session) return <main id="main-content" className="section-wrap space-y-8"><PageHeading title="Results publication" description="Review locked event divisions and publish results."/><p role="alert" className="form-error">{accountError || "Sign in with an authorized chapter account to continue."}</p></main>;
  if (session.chapter_id !== chapterId || !["head_judge", "chapter_director"].includes(session.role)) return <main id="main-content" className="section-wrap space-y-8"><PageHeading title="Results publication" description="Review locked event divisions and publish results."/><p role="alert" className="form-error">An active head judge or chapter director membership is required for this chapter.</p></main>;
  return <PublicationWorkspace key={`${session.uid}:${chapterId}:${eventId}`} chapterId={chapterId} eventId={eventId} uid={session.uid}/>;
}

function PublicationWorkspace({ chapterId, eventId, uid }: { chapterId: string; eventId: string; uid: string }) {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [snapshots, setSnapshots] = useState<PublishedSnapshot[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [busyId, setBusyId] = useState("");
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loaded, setLoaded] = useState(false);

  const base = `/v1/chapters/${segment(chapterId)}/events/${segment(eventId)}`;
  const load = useCallback(async (nextCursor?: string | null) => {
    if (!uid) return;
    setBusy(true);
    setError("");
    try {
      const [divisionPage, published] = await Promise.all([
        connectedPage<Division>(`${base}/division-status`, nextCursor, uid),
        fetch(`${resolveApiBase()}/v1/events/${segment(eventId)}/published`, {
          cache: "no-store",
          signal: AbortSignal.timeout(8000),
        }).then(async response => {
          if (!response.ok) throw new Error("Published results could not be loaded.");
          return response.json() as Promise<PublishedSnapshot[]>;
        }),
      ]);
      if (!Array.isArray(divisionPage.items) || divisionPage.items.some(item => typeof item.id !== "string" || !item.id || typeof item.name !== "string" || typeof item.locked !== "boolean" || (item.publication_id !== null && typeof item.publication_id !== "string") || !Number.isSafeInteger(item.approved_entries) || item.approved_entries < 0 || !Number.isSafeInteger(item.unready_entries) || item.unready_entries < 0) || (divisionPage.next_page !== null && typeof divisionPage.next_page !== "string")) throw new Error("Division publication status could not be verified for this event.");
      if (!validPublicationCollection(published, chapterId, eventId)) throw new Error("Published result receipts could not be verified for this event and chapter.");
      setDivisions(current => nextCursor ? [...current, ...divisionPage.items] : divisionPage.items);
      setSnapshots(published);
      setCursor(divisionPage.next_page);
      setLoaded(true);
    } catch (reason) {
      const status = typeof reason === "object" && reason !== null && "status" in reason
        ? Number((reason as { status: unknown }).status)
        : 0;
      setError(status === 409 ? publicationConflictMessage() : reason instanceof Error ? reason.message : "Results could not be loaded. Retry when connected.");
    } finally {
      setBusy(false);
    }
  }, [base, eventId, uid]);

  useEffect(() => {
    if (!uid) return;
    void load();
  }, [uid, load]);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const snapshotByDivision = new Map(snapshots.map(snapshot => [snapshot.division_id, snapshot]));
  async function publish(division: Division) {
    if (!uid || busy || !online || !division.locked || division.publication_id) return;
    setBusy(true);
    setBusyId(division.id);
    setError("");
    setNotice("");
    try {
      const snapshot = await connectedRequest<PublishedSnapshot>(`${base}/divisions/${segment(division.id)}/publish`, {}, "POST", uid);
      if (!validPublicationCollection([snapshot], chapterId, eventId) || snapshot.division_id !== division.id) throw new Error("The publication receipt could not be verified for this chapter, event and division.");
      setSnapshots(current => [...current.filter(item => item.division_id !== division.id), snapshot]);
      setDivisions(current => current.map(item => item.id === division.id
        ? { ...item, publication_id: snapshot.publication_id }
        : item));
      setNotice(`${division.name} is published. The saved projection is immutable; its receipt and digest are shown below.`);
    } catch (reason) {
      const status = typeof reason === "object" && reason !== null && "status" in reason
        ? Number((reason as { status: unknown }).status)
        : 0;
      setError(status === 409 ? publicationConflictMessage() : reason instanceof Error ? reason.message : "Publication could not be confirmed. Retry safely when online.");
      // Publishing is idempotent, so a lost response can be resolved by refreshing.
    } finally {
      setBusy(false);
      setBusyId("");
    }
  }

  const publishedCount = divisions.filter(division => !!division.publication_id).length;
  const lockedCount = divisions.filter(division => division.locked).length;

  return (
    <main id="main-content" className="section-wrap space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeading
          eyebrow={`Chapter / ${chapterId.toUpperCase()} / Events`}
          title="Results publication"
          description={`Review server-confirmed division locks and publish immutable results for event ${eventId}. Unresolved ties remain unpublished until an approved policy is recorded.`}
        />
        <Link
          href={`/events/${segment(eventId)}/results`}
          target="_blank"
          rel="noreferrer"
          className="button button-secondary"
          style={{ minHeight: "48px" }}
        >
          View public results <Arrow diagonal />
        </Link>
      </div>

      {error && <div className="form-error" role="alert">{error}</div>}
      {notice && <p className="info-note" role="status">{notice}</p>}
      {!online && <p className="info-note" role="status">You are offline. Publication and refresh need a connection; saved results remain unchanged.</p>}

      {(
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              ["Divisions loaded", divisions.length, cursor ? "More divisions are available" : "Event division list"],
              ["Locked by server", lockedCount, "Complete scoring barrier"],
              ["Published", publishedCount, "Public projections"],
            ].map(([label, value, detail]) => (
              <div key={String(label)} className="panel p-4 border border-subtle">
                <p className="eyebrow">{label}</p>
                <p className="mono text-2xl text-chrome tabular-nums">{value}</p>
                <p className="text-sm text-titanium">{detail}</p>
              </div>
            ))}
          </div>

          {!loaded && busy ? <p role="status">Loading event divisions…</p> : divisions.length === 0 ? (
            <div className="panel p-6 space-y-4">
              <p>{loaded ? "No divisions are configured for this event." : "The event division list is not available yet."}</p>
              <Button variant="secondary" onClick={() => void load()} disabled={busy || !online}>Retry</Button>
            </div>
          ) : (
            <div className="space-y-4">
              {divisions.map(division => {
                const snapshot = snapshotByDivision.get(division.id);
                const published = !!division.publication_id;
                return (
                  <section key={division.id} className="panel p-6 bg-carbon border border-subtle rounded-xl space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h2 className="text-xl font-bold text-chrome">{division.name}</h2>
                          <Status tone={published ? "volt" : division.locked ? "amber" : "neutral"}>
                            {published ? "Published" : division.locked ? "Locked · ready for review" : "Scoring in progress"}
                          </Status>
                        </div>
                        <p className="text-sm text-titanium">
                          Approved entries: <strong className="text-chrome mono">{division.approved_entries}</strong>
                          {division.unready_entries > 0 && <> · Not ready: <strong className="text-chrome mono">{division.unready_entries}</strong></>}
                        </p>
                      </div>
                      {published ? (
                        <Link className="button button-outline" style={{ minHeight: "48px" }} href={`/events/${segment(eventId)}/results`}>
                          View published projection <Arrow diagonal />
                        </Link>
                      ) : (
                        <Button
                          variant={division.locked ? "primary" : "secondary"}
                          onClick={() => void publish(division)}
                          disabled={!division.locked || busy || !online}
                          style={{ minHeight: "48px" }}
                        >
                          {busyId === division.id ? "Publishing…" : division.locked ? "Publish immutable results" : "Awaiting division lock"}
                        </Button>
                      )}
                    </div>
                    {snapshot && <div className="fineprint space-y-1" aria-label="Publication receipt">
                      <p>Receipt: <span className="mono">{snapshot.publication_id}</span> · {new Date(snapshot.published_at * 1000).toISOString()}</p>
                      <p>SHA-256: <span className="mono break-all">{snapshot.digest}</span></p>
                    </div>}
                    {published && !snapshot && <p className="fineprint">Published projection exists. Refresh to load its public receipt.</p>}
                  </section>
                );
              })}
              {cursor && <Button variant="secondary" onClick={() => void load(cursor)} disabled={busy}>Load more divisions</Button>}
            </div>
          )}
          <Button variant="secondary" onClick={() => void load()} disabled={busy || !online}>Refresh publication status</Button>
        </>
      )}
    </main>
  );
}
