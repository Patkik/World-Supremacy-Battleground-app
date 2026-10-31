"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAccount } from "@/lib/account";
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
  division_id: string;
  published_at: number;
  digest: string;
  results: { entry_id: string; crew_id: string; final_score: number; rank: number }[];
};

function publicationConflictMessage() {
  return "Publication did not complete. Check the division lock, panel scores, unresolved ties, and public event ID before retrying.";
}

export function ConnectedResultsPublication({
  chapterId,
  eventId,
}: {
  chapterId: string;
  eventId: string;
}) {
  const { user, loading, error: accountError } = useAccount();
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
    if (!user) return;
    setBusy(true);
    setError("");
    try {
      const [divisionPage, published] = await Promise.all([
        connectedPage<Division>(`${base}/division-status`, nextCursor),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8088"}/v1/events/${segment(eventId)}/published`, {
          cache: "no-store",
          signal: AbortSignal.timeout(8000),
        }).then(async response => {
          if (!response.ok) throw new Error("Published results could not be loaded.");
          return response.json() as Promise<PublishedSnapshot[]>;
        }),
      ]);
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
  }, [base, eventId, user]);

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user, load]);

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
    if (!user || busy || !online || !division.locked || division.publication_id) return;
    setBusy(true);
    setBusyId(division.id);
    setError("");
    setNotice("");
    try {
      const snapshot = await connectedRequest<PublishedSnapshot>(`${base}/divisions/${segment(division.id)}/publish`, {});
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

      {accountError && <p className="form-error" role="alert">{accountError}</p>}
      {error && <div className="form-error" role="alert">{error}</div>}
      {notice && <p className="info-note" role="status">{notice}</p>}
      {!online && <p className="info-note" role="status">You are offline. Publication and refresh need a connection; saved results remain unchanged.</p>}

      {loading ? <p role="status">Checking your account…</p> : !user ? (
        <div className="panel p-6 space-y-4">
          <p>Sign in with an authorized head judge or chapter director account to review publication status.</p>
          <Link href={`/sign-in?returnTo=${encodeURIComponent(`/admin/${chapterId}/events/${eventId}/results`)}`} className="button button-volt">Sign in</Link>
        </div>
      ) : (
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
