"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useWorkspaceSession } from "@/lib/account";
import { ApiError, connectedPage, connectedRequest, segment } from "@/lib/connected-api";
import type { Entry } from "@/lib/api";
import { PageHeading } from "./ui";

type StageStatus = { stage_id: string; position: "holding" | "on_deck" | "performing" | "completed"; revision: number; updated_at: number; stage_active: boolean; stage_held: boolean };
function validStageStatuses(value: unknown): value is StageStatus[] {
  return Array.isArray(value) && value.every(item => item && typeof item.stage_id === "string" && ["holding", "on_deck", "performing", "completed"].includes(item.position) && Number.isSafeInteger(item.revision) && Number.isSafeInteger(item.updated_at) && item.updated_at > 0 && item.updated_at <= 8640000000000 && typeof item.stage_held === "boolean" && typeof item.stage_active === "boolean");
}

function StageCallSheet({ uid, chapterId, eventId, entries }: { uid: string; chapterId: string; eventId: string; entries: Entry[] }) {
  const [items, setItems] = useState<Record<string, StageStatus[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);
  const generation = useRef(0);
  const inFlight = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    if (inFlight.current !== null || entries.length === 0) return;
    const current = ++generation.current;
    inFlight.current = current;
    setBusy(true);
    setErrors({});
    const nextItems: Record<string, StageStatus[]> = {};
    const nextErrors: Record<string, string> = {};
    try {
      for (let offset = 0; offset < entries.length; offset += 4) {
        const batch = entries.slice(offset, offset + 4);
        try {
          const value = await connectedRequest<{ items: { entry_id: string; positions: unknown }[] }>(
            `/v1/chapters/${segment(chapterId)}/events/${segment(eventId)}/stage-calls`,
            { entry_ids: batch.map(entry => entry.id) }, "POST", uid,
          );
          if (!Array.isArray(value.items) || value.items.length !== batch.length || new Set(value.items.map(item => item.entry_id)).size !== batch.length || value.items.some(item => !batch.some(entry => entry.id === item.entry_id))) throw new Error("The stage status response could not be verified.");
          for (const item of value.items) {
            if (validStageStatuses(item.positions)) nextItems[item.entry_id] = item.positions;
            else {
              nextErrors[item.entry_id] = "Stage status is unavailable for this entry.";
              if (generation.current === current) {
                setItems(previous => { const remaining = { ...previous }; delete remaining[item.entry_id]; return remaining; });
                setErrors(previous => ({ ...previous, [item.entry_id]: nextErrors[item.entry_id] }));
              }
            }
          }
        } catch (reason) {
          for (const entry of batch) nextErrors[entry.id] = reason instanceof Error ? reason.message : "Stage status could not be loaded.";
          if (generation.current === current && reason instanceof ApiError && [401, 403, 404].includes(reason.status)) {
            setItems(previous => { const remaining = { ...previous }; for (const entry of batch) delete remaining[entry.id]; return remaining; });
            setErrors(previous => ({ ...previous, ...nextErrors }));
          }
        }
        if (generation.current !== current) return;
      }
      if (generation.current === current) {
        setItems(nextItems);
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length === 0) setUpdatedAt(Math.floor(Date.now() / 1000));
      }
    } finally {
      if (inFlight.current === current) inFlight.current = null;
      if (generation.current === current) setBusy(false);
    }
  }, [entries, chapterId, eventId, uid]);

  useEffect(() => {
    const updateConnection = () => {
      const disconnected = !navigator.onLine;
      setOffline(disconnected);
      if (!disconnected && document.visibilityState === "visible") void refresh();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible" && navigator.onLine) void refresh();
    };
    updateConnection();
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    document.addEventListener("visibilitychange", onVisibility);
    const timer = window.setInterval(onVisibility, 30_000);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
      document.removeEventListener("visibilitychange", onVisibility);
      generation.current++;
      inFlight.current = null;
    };
  }, [refresh]);

  return <section className="panel"><div className="connected-actions"><h2>Your stage calls</h2><button type="button" className="button button-outline" disabled={busy || entries.length === 0} onClick={() => void refresh()}>{busy ? "Checking calls…" : updatedAt ? "Refresh stage calls" : "Check stage calls"}</button></div><p>Stage calls refresh about every 30 seconds while this page is visible and connected. This is not a digital venue pass.</p>{busy && <p role="status">Updating stage calls…</p>}{offline && <p role="status">This device reports it is offline. Displayed calls may be out of date.</p>}{updatedAt !== null && <p className="fineprint">Last complete check finished {new Date(updatedAt * 1000).toLocaleTimeString()} · {entries.length} loaded entries</p>}{entries.length === 0 && <p>No entries are available on this page.</p>}{entries.map(entry => <article key={entry.id} className="panel"><h3>{entry.crew_id} · {entry.division_id}</h3>{errors[entry.id] ? <p className="form-error" role="alert">{errors[entry.id]}</p> : items[entry.id] ? items[entry.id].length ? <ul>{items[entry.id].map(item => <li key={item.stage_id}><strong>{item.stage_id}</strong> · {item.position.replaceAll("_", " ")}{item.stage_held ? " · stage held" : ""}{!item.stage_active ? " · stage inactive" : ""}<span className="fineprint"> · updated {new Date(item.updated_at * 1000).toLocaleTimeString()}</span></li>)}</ul> : <p>No stage position is recorded for this entry.</p> : <p className="fineprint">Stage status has not been checked yet.</p>}</article>)}</section>;
}

function OwnCheckIn({ uid, chapterId, eventId }: { uid: string; chapterId: string; eventId: string }) {
  const [status, setStatus] = useState<{ recorded: boolean; checked_in_at: number | null } | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const generation = useRef(0);
  const load = useCallback(async () => {
    const current = ++generation.current; setBusy(true); setError(""); setStatus(null);
    try {
      const value = await connectedRequest<{ recorded: boolean; checked_in_at: number | null }>(`/v1/chapters/${segment(chapterId)}/events/${segment(eventId)}/check-in/me`, undefined, "GET", uid);
      if (typeof value.recorded !== "boolean" || (value.recorded ? !Number.isSafeInteger(value.checked_in_at) || value.checked_in_at! <= 0 || value.checked_in_at! > 8640000000000 : value.checked_in_at !== null)) throw new Error("The check-in response could not be verified.");
      if (generation.current === current) setStatus(value);
    } catch (reason) { if (generation.current === current) setError(reason instanceof Error ? reason.message : "Check-in status could not be loaded."); }
    finally { if (generation.current === current) setBusy(false); }
  }, [chapterId, eventId, uid]);
  useEffect(() => { void load(); return () => { generation.current++; }; }, [load]);
  return <section className="panel"><h2>Your check-in</h2>{busy ? <p role="status">Checking your status…</p> : status && <p role="status">{status.recorded ? `Check-in recorded ${new Date(status.checked_in_at! * 1000).toLocaleString()}.` : "No check-in is recorded for this account."}</p>}{error && <p className="form-error" role="alert">{error}</p>}<p className="fineprint">This is your recorded arrival, not a venue pass or proof of eligibility.</p><button type="button" className="button button-outline" disabled={busy} onClick={() => void load()}>Refresh check-in</button></section>;
}

function Entries({ uid, chapterId, eventId, role }: { uid: string; chapterId: string; eventId: string; role: string }) {
  const [entries, setEntries] = useState<Entry[]>([]); const [cursor, setCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false); const [loaded, setLoaded] = useState(false); const [error, setError] = useState("");
  const generation = useRef(0);
  const load = useCallback(async (next?: string | null) => {
    const current = ++generation.current; setBusy(true); setError("");
    try {
      const page = await connectedPage<Entry>(`/v1/chapters/${segment(chapterId)}/events/${segment(eventId)}/entries`, next, uid);
      if (generation.current === current) { setEntries(value => [...new Map((next ? [...value, ...page.items] : page.items).map(entry => [entry.id, entry])).values()]); setCursor(page.next_page); setLoaded(true); }
    } catch (reason) { if (generation.current === current) { setEntries([]); setCursor(null); setError(reason instanceof Error ? reason.message : "Entries could not be loaded."); setLoaded(true); } }
    finally { if (generation.current === current) setBusy(false); }
  }, [chapterId, eventId, uid]);
  useEffect(() => { void load(); return () => { generation.current++; }; }, [load, uid]);
  return <>{["crew_manager", "dancer"].includes(role) && <OwnCheckIn uid={uid} chapterId={chapterId} eventId={eventId} />}<section className="panel"><h2>Event entries</h2><p>These entries are loaded for your current chapter account. Open an entry to check its server-reported status and readiness.</p><button type="button" className="button button-outline" disabled={busy} onClick={() => void load()}>Refresh entries</button>
    {busy && <p role="status">Loading entries…</p>}{error && <p className="form-error" role="alert">{error}</p>}{loaded && !error && entries.length === 0 && <p>No entries were found on the pages loaded.</p>}
    {entries.map(entry => <article className="panel" key={entry.id}><h3>{entry.crew_id}</h3><p>{entry.division_id} · {entry.status.replaceAll("_", " ")}</p><div className="connected-actions"><Link className="button button-outline" href={`/app/entries/${segment(entry.id)}?event=${segment(eventId)}`}>Open entry</Link><Link className="button button-outline" href={`/events/${segment(eventId)}/results/${segment(entry.id)}`}>View published result</Link></div></article>)}
    {cursor && <button type="button" className="button button-outline" disabled={busy} onClick={() => void load(cursor)}>Load more entries</button>}
  </section>{loaded && !error && ["crew_manager", "dancer"].includes(role) && <StageCallSheet key={JSON.stringify(entries.map(entry => entry.id))} uid={uid} chapterId={chapterId} eventId={eventId} entries={entries} />}<section className="panel"><h2>Digital venue passes</h2><p>Signed venue passes and offline scanning are not available yet. A stage call or recorded online check-in is not a venue credential.</p><Link href="/app/support" className="button button-outline">Contact the event team</Link></section></>;
}

export function EventDayEntries({ eventId }: { eventId: string }) {
  const { session, user, loading, error } = useWorkspaceSession();
  const next = `/app/event-day/${segment(eventId)}`;
  return <main id="main-content" className="workspace-main"><PageHeading title="Event day" description="Check your entries and event-day information." /><div className="connected-stack">{loading || (user && !error && (!session || session.uid !== user.uid)) ? <p role="status">Checking chapter access…</p> : !session || !user || session.uid !== user.uid ? <><p>{error || "Sign in to continue."}</p><Link className="button button-outline" href={`/sign-in?next=${segment(next)}`}>Sign in</Link></> : <Entries key={JSON.stringify([session.uid, session.chapter_id, eventId])} uid={session.uid} chapterId={session.chapter_id} eventId={eventId} role={session.role} />}</div></main>;
}
