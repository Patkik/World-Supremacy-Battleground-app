"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useWorkspaceSession } from "@/lib/account";
import { connectedPage, segment } from "@/lib/connected-api";
import { PageHeading } from "./ui";
type Assignment = { entry_id: string; crew_id: string; division_id: string };
export function JudgeLineup({ eventId }: { eventId: string }) {
  const { session, loading, error: sessionError } = useWorkspaceSession();
  const [entries, setEntries] = useState<Assignment[]>([]); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const load = useCallback(async (next?: string | null) => {
    if (!session) return;
    setBusy(true); setError("");
    try { const page = await connectedPage<Assignment>(`/v1/chapters/${segment(session.chapter_id)}/events/${segment(eventId)}/judge-lineup`, next); setEntries(previous => next ? [...previous, ...page.items] : page.items); setCursor(page.next_page); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load assignments."); }
    finally { setBusy(false); }
  }, [session, eventId]);
  useEffect(() => { void load(); }, [load]);
  return <main id="main-content" className="workspace-main"><PageHeading title="Your assigned performances" description="Only approved entries in your assigned judging divisions appear here." /><div className="connected-stack">
    {loading ? <p role="status">Checking your assignment…</p> : !session ? <><p>{sessionError || "Sign in to continue."}</p><Link href="/sign-in">Sign in</Link></> : <><div className="connected-actions"><button className="button button-outline" disabled={busy} onClick={() => void load()}>Refresh assignments</button><Link className="button button-outline" href="/offline">Prepare offline workspace</Link><Link className="button button-outline" href={`/console/${segment(eventId)}/sync`}>Saved scores</Link></div>{!busy && entries.length === 0 && !error && <p>No approved performances found on the pages loaded.</p>}{entries.map(entry => <article className="panel" key={entry.entry_id}><h2>{entry.crew_id}</h2><p>{entry.division_id}</p><Link className="button button-volt" href={`/console/${segment(eventId)}/judge/${segment(entry.entry_id)}`}>Open scorecard</Link></article>)}{cursor && <button className="button button-outline" disabled={busy} onClick={() => void load(cursor)}>Load more assignments</button>}</>}{error && <p role="alert" className="form-error">{error}</p>}
  </div></main>;
}
