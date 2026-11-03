"use client";
import { useState, type FormEvent } from "react";
import { ConnectedScorecard } from "./connected-scorecard";
import { ScoreOutbox } from "./score-outbox";
import { selectedChapterFor, useWorkspaceSession } from "@/lib/account";
import { connectedPage, segment } from "@/lib/connected-api";
import { scoreStore } from "@/lib/judging/sync";
import { Brand } from "./ui";
import { useCallback, useEffect, useRef, useState as useReactState } from "react";

type AssignedEntry = { entry_id: string; crew_id: string; division_id: string };

export function OfflineWorkspace() {
  const { user, session, loading: sessionLoading, error: sessionError } = useWorkspaceSession();
  const [event, setEvent] = useState(""); const [entry, setEntry] = useState("");
  const [selected, setSelected] = useState<{ event: string; entry: string } | null>(null);
  const [message, setMessage] = useState(""); const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [assignments, setAssignments] = useReactState<AssignedEntry[]>([]);
  const [cursor, setCursor] = useReactState<string | null>(null);
  const [loadingEntries, setLoadingEntries] = useReactState(false);
  const [lineupError, setLineupError] = useReactState("");
  const [lineupNotice, setLineupNotice] = useReactState("");
  const [trustedDevice, setTrustedDevice] = useReactState(false);
  const [online, setOnline] = useReactState(true);
  const chapter = session && user && session.uid === user.uid ? session.chapter_id : user ? selectedChapterFor(user.uid) : null;
  const trustIdentity = `${user?.uid ?? "signed-out"}/${chapter ?? "no-chapter"}`;
  const priorTrustIdentity = useRef(trustIdentity);
  const lineupGeneration = useRef(0);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update(); window.addEventListener("online", update); window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);
  const loadAssignments = useCallback(async (next?: string | null) => {
    if (!user || !chapter || !event.trim()) return;
    const generation = ++lineupGeneration.current;
    const requestedEvent = event.trim();
    setLoadingEntries(true); setLineupError("");
    try {
      if (!navigator.onLine) {
        if (!trustedDevice) throw new Error("Confirm this is your trusted device to open its saved assignment list.");
        const cached = await scoreStore.getCachedLineup(user.uid, chapter, requestedEvent);
        if (generation !== lineupGeneration.current) return;
        if (!cached) throw new Error("No assignment list was saved for this event on this device. Reconnect and load it before continuing.");
        const valid = cached.filter(item => !!item && typeof item.entry_id === "string" && typeof item.crew_id === "string" && typeof item.division_id === "string");
        setAssignments(valid); setCursor(null);
        setLineupNotice("Showing the assignment list saved on this device. It does not prove current access; online authorization is required to submit.");
        return;
      }
      if (!session || session.uid !== user.uid || session.chapter_id !== chapter) throw new Error("Confirm your current chapter access before loading assignments.");
      const result = await connectedPage<AssignedEntry>(`/v1/chapters/${segment(chapter)}/events/${segment(requestedEvent)}/judge-lineup`, next, user.uid);
      if (generation !== lineupGeneration.current) return;
      if (!result.items.every(item => item && typeof item.entry_id === "string" && typeof item.crew_id === "string" && typeof item.division_id === "string")) throw new Error("The assigned lineup response was invalid.");
      const combined = next ? [...assignments, ...result.items] : result.items;
      const byEntry = new Map(combined.map(item => [item.entry_id, item]));
      const merged = [...byEntry.values()];
      setAssignments(merged); setCursor(result.next_page); setLineupNotice("");
      if (trustedDevice) {
        try { await scoreStore.putCachedLineup(user.uid, chapter, requestedEvent, merged); }
        catch { if (generation === lineupGeneration.current) setLineupNotice("Assignments loaded online, but the list could not be saved on this device."); }
      }
    } catch (reason) { if (generation === lineupGeneration.current) setLineupError(reason instanceof Error ? reason.message : "Unable to load assigned entries."); }
    finally { if (generation === lineupGeneration.current) setLoadingEntries(false); }
  }, [session, user, chapter, event, trustedDevice, assignments]);
  useEffect(() => { ++lineupGeneration.current; setAssignments([]); setCursor(null); setLoadingEntries(false); setLineupError(""); setLineupNotice(""); setEntry(""); }, [user?.uid, chapter, event]);
  useEffect(() => {
    if (priorTrustIdentity.current === trustIdentity) return;
    priorTrustIdentity.current = trustIdentity;
    ++lineupGeneration.current; setTrustedDevice(false);
  }, [trustIdentity]);
  async function prepare() {
    setBusy(true); setError("");
    try {
      if (!navigator.serviceWorker || !navigator.locks) throw new Error("Use a current browser that supports offline judging.");
      if (!navigator.onLine) throw new Error("Connect to the internet to prepare this device for the current app version.");
      const buildResponse = await fetch("/build-id", { cache: "no-store", credentials: "omit", signal: AbortSignal.timeout(5000) });
      if (!buildResponse.ok) throw new Error("The app version could not be checked. Reconnect and try again.");
      const buildPayload: unknown = await buildResponse.json();
      const buildId = typeof buildPayload === "object" && buildPayload !== null && "buildId" in buildPayload ? buildPayload.buildId : null;
      if (typeof buildId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(buildId)) throw new Error("The app version could not be verified. Reconnect and try again.");
      await navigator.serviceWorker.register(`/sw.js?build=${encodeURIComponent(buildId)}`, { scope: "/", updateViaCache: "none" });
      await navigator.serviceWorker.ready;
      // Requesting persistence is a best effort. Browser eviction remains possible.
      const persistent = await navigator.storage?.persist?.();
      setMessage(persistent ? "Offline workspace prepared. Save a draft for each assigned entry before the venue loses connection." : "Offline workspace prepared. The browser may clear device storage, so keep this device’s browser data until all receipts arrive.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not prepare offline workspace."); }
    finally { setBusy(false); }
  }
  function open(eventForm: FormEvent) { eventForm.preventDefault(); setSelected({ event: event.trim(), entry: entry.trim() }); }
  function changeEvent(value: string) { ++lineupGeneration.current; setEvent(value); setAssignments([]); setCursor(null); setLineupError(""); setLineupNotice(""); setEntry(""); }
  function changeTrust(value: boolean) {
    setTrustedDevice(value);
    if (value) return;
    ++lineupGeneration.current; setAssignments([]); setCursor(null); setLineupNotice("");
    if (user) void scoreStore.removeCachedLineups(user.uid).catch(reason => setLineupError(reason instanceof Error ? reason.message : "The saved assignment lists could not be removed."));
  }
  if (selected?.entry) return <ConnectedScorecard eventId={selected.event} entryId={selected.entry} />;
  if (selected) return <ScoreOutbox eventId={selected.event} />;
  return <main id="main-content" className="system-page"><Brand /><div className="account-form"><h1>Offline judging workspace</h1><p>Prepare this trusted device while online. Only saved drafts and queued commands can be restored without a connection.</p>
    <button className="button button-volt" disabled={busy} onClick={prepare}>{busy ? "Preparing…" : "Prepare this trusted device"}</button>
    {user && <label className="trust-device"><input type="checkbox" checked={trustedDevice} onChange={e => changeTrust(e.target.checked)} />Allow this device to save my assigned lineup for offline lookup.</label>}
    <p className="sync-state" role="status">{online ? "Online" : "Offline"}</p>
    {message && <p role="status">{message}</p>}{error && <p className="form-error" role="alert">{error}</p>}
    <form onSubmit={open}><label htmlFor="offline-event">Event ID<input id="offline-event" value={event} onChange={e => changeEvent(e.target.value)} required /></label><button type="button" className="button button-outline" disabled={!user || loadingEntries || !event.trim() || (!online && !trustedDevice) || (online && (!session || session.uid !== user?.uid))} onClick={() => void loadAssignments()}>{loadingEntries ? "Loading assigned entries…" : online ? "Load my assigned entries" : "Load saved assignments on this device"}</button><label htmlFor="offline-entry">Assigned entry ID<input id="offline-entry" value={entry} onChange={e => setEntry(e.target.value)} list="assigned-entry-ids" required /></label><datalist id="assigned-entry-ids">{assignments.map(item => <option key={item.entry_id} value={item.entry_id}>{item.crew_id} · {item.division_id}</option>)}</datalist>{assignments.map(item => <button key={item.entry_id} type="button" className="button button-outline" onClick={() => { setEntry(item.entry_id); setSelected({ event: event.trim(), entry: item.entry_id }); }}>{item.crew_id} · {item.division_id} · Open assigned scorecard</button>)}{cursor && <button type="button" className="button button-outline" disabled={loadingEntries} onClick={() => void loadAssignments(cursor)}>Load more assignments</button>}<button className="button button-outline">Open scorecard</button></form>
    {lineupNotice && <p role="status" className="info-note">{lineupNotice}</p>}
    {sessionLoading && <p role="status">Checking account access…</p>}{!user && !sessionLoading && <p role="alert">{sessionError || "Sign in to load assigned entries."}</p>}{online && user && !session && !sessionLoading && <p role="alert">{sessionError || "Choose an active chapter before loading assignments."}</p>}{lineupError && <p role="alert" className="form-error">{lineupError}</p>}
    <p className="fineprint">Your Firebase browser session must still be available. A trusted device may store only your assigned entry IDs and labels to help find previously saved scorecards; cached assignments do not prove current access. Offline drafts require server authorization when the connection returns. Payment records, identity documents and other private server responses are not cached.</p>
  </div></main>;
}
