"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useWorkspaceSession } from "@/lib/account";
import { connectedRequest, segment } from "@/lib/connected-api";
import { registrationCommand } from "@/lib/registration-command";
import { PageHeading } from "./ui";

type Match = { match_id: string; event_id: string; category: string; round: string; red_corner_name: string; blue_corner_name: string; votes_red: number; votes_blue: number; winner_corner: string | null; status: string };
const text = (value: string) => value.trim().length > 0 && value.trim().length <= 120;

function Editor({ chapter, event, uid }: { chapter: string; event: string; uid: string }) {
  const base = `/v1/chapters/${segment(chapter)}/events/${segment(event)}/battles`;
  const [items, setItems] = useState<Match[]>([]); const [id, setId] = useState(""); const [category, setCategory] = useState(""); const [round, setRound] = useState(""); const [red, setRed] = useState(""); const [blue, setBlue] = useState(""); const [panel, setPanel] = useState("");
  const [draftRevisions, setDraftRevisions] = useState<Record<string, number>>({});
  const [cursor, setCursor] = useState<string | null>(null); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const result = await connectedRequest<{ items: Match[]; next_page: string | null }>(base, undefined, "GET", uid); setItems(result.items); setCursor(result.next_page); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Battles could not be loaded."); }
    finally { setLoading(false); }
  }, [base, uid]);
  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true); setError("");
    try { const result = await connectedRequest<{ items: Match[]; next_page: string | null }>(`${base}?cursor=${segment(cursor)}`, undefined, "GET", uid); setItems(previous => [...previous, ...result.items]); setCursor(result.next_page); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "More battles could not be loaded."); }
    finally { setLoading(false); }
  }, [base, cursor, loading]);
  useEffect(() => { void load(); }, [load]);
  async function save(eventObject: FormEvent) {
    eventObject.preventDefault(); setError(""); setNotice("");
    const idValue = id.trim(); const judges = panel.split(/[\s,]+/).filter(Boolean);
    if (!idValue || idValue.length > 200 || idValue.includes("/") || idValue === "." || idValue === ".." || ![category, round, red, blue].every(text) || red.trim() === blue.trim() || ![3, 5].includes(judges.length) || new Set(judges).size !== judges.length) { setError("Enter a match reference, category, round, distinct corner names and three or five unique judge account references."); return; }
    setBusy(true);
    try {
      const expectedRevision = draftRevisions[idValue] ?? 0;
      const result = await registrationCommand<Match>(`${base}/${segment(idValue)}`, { expected_revision: expectedRevision, panel: judges, category: category.trim(), round: round.trim(), red_corner_name: red.trim(), blue_corner_name: blue.trim() }, "POST", false, uid);
      const config = await connectedRequest<{ revision: number }>(`${base}/${segment(result.match_id)}/configuration`, undefined, "GET", uid);
      setDraftRevisions(previous => ({ ...previous, [result.match_id]: config.revision })); setNotice(`Battle draft ${result.match_id} saved. It is not active for voting.`); setId(""); setCategory(""); setRound(""); setRed(""); setBlue(""); setPanel(""); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Battle draft could not be saved."); }
    finally { setBusy(false); }
  }
  async function editDraft(matchId: string) {
    setBusy(true); setError("");
    try { const config = await connectedRequest<{revision:number;panel:string[];record:Match}>(`${base}/${segment(matchId)}/configuration`, undefined, "GET", uid); setId(matchId); setCategory(config.record.category); setRound(config.record.round); setRed(config.record.red_corner_name); setBlue(config.record.blue_corner_name); setPanel(config.panel.join("\n")); setDraftRevisions(previous => ({...previous,[matchId]:config.revision})); } catch (reason) { setError(reason instanceof Error ? reason.message : "Battle configuration could not be loaded."); } finally { setBusy(false); }
  }
  async function activate(matchId: string) {
    const expected = draftRevisions[matchId]; if (expected === undefined) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const value = await registrationCommand<Match>(`${base}/${segment(matchId)}/activate`, { expected_revision: expected }, "POST", false, uid);
      setNotice(`Battle ${value.match_id} is active for voting.`); setDraftRevisions(previous => { const next = { ...previous }; delete next[matchId]; return next; }); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Battle activation could not be confirmed. Retry to recover the result."); }
    finally { setBusy(false); }
  }
  return <div className="connected-stack">{error && <p role="alert" className="form-error">{error}</p>}{notice && <p role="status">{notice}</p>}<section className="panel"><h2>Configure battle draft</h2><p>Only a chapter director can save a draft. The named judges must have active event assignments. Saving does not activate voting.</p><form className="connected-stack" onSubmit={save}><label htmlFor="battle-id">Match reference</label><input id="battle-id" required maxLength={200} value={id} disabled={busy} onChange={e => setId(e.target.value)} /><label htmlFor="battle-category">Category</label><input id="battle-category" required maxLength={120} value={category} disabled={busy} onChange={e => setCategory(e.target.value)} /><label htmlFor="battle-round">Round</label><input id="battle-round" required maxLength={120} value={round} disabled={busy} onChange={e => setRound(e.target.value)} /><label htmlFor="battle-red">Red corner name</label><input id="battle-red" required maxLength={120} value={red} disabled={busy} onChange={e => setRed(e.target.value)} /><label htmlFor="battle-blue">Blue corner name</label><input id="battle-blue" required maxLength={120} value={blue} disabled={busy} onChange={e => setBlue(e.target.value)} /><label htmlFor="battle-panel">Judge account references</label><textarea id="battle-panel" required rows={3} value={panel} disabled={busy} onChange={e => setPanel(e.target.value)} /><p>Enter three or five unique chapter judge account references, separated by spaces or commas.</p><button type="submit" className="button button-volt" disabled={busy}>{busy ? "Saving battle draft…" : "Save battle draft"}</button></form></section><section className="connected-stack"><h2>Event battles</h2>{loading ? <p role="status">Loading battles…</p> : !error && items.length === 0 ? <p>No configured battles were found.</p> : null}{items.map(match => <article className="panel" key={match.match_id}><h3>{match.category} · {match.round}</h3><p>{match.match_id}: {match.red_corner_name} vs {match.blue_corner_name}</p><p>Status: {match.status}</p>{match.status === "draft" && <><button type="button" className="button button-outline" disabled={busy} onClick={() => void editDraft(match.match_id)}>Edit / load draft</button>{draftRevisions[match.match_id] !== undefined && <button type="button" className="button button-outline" disabled={busy} onClick={() => void activate(match.match_id)}>Activate voting</button>}</>}</article>)}{cursor && <button type="button" className="button button-outline" disabled={loading || busy} onClick={() => void loadMore()}>{loading ? "Loading…" : "Load more battles"}</button>}<button type="button" className="button button-outline" disabled={loading || busy} onClick={() => void load()}>Refresh battles</button></section></div>;
}

export function BattleDraftWorkspace({ chapter, event }: { chapter: string; event: string }) {
  const { session, loading, error } = useWorkspaceSession(chapter);
  return <main id="main-content" className="workspace-main"><PageHeading title="Battle configuration" description="Prepare versioned match drafts and assigned panels." />{loading ? <p role="status">Checking chapter access…</p> : !session ? <p>{error || "Sign in to continue."}</p> : session.chapter_id !== chapter || session.role !== "chapter_director" ? <p>This event workspace is available to its chapter director.</p> : <Editor key={`${session.uid}:${chapter}:${event}`} chapter={chapter} event={event} uid={session.uid} />}</main>;
}
