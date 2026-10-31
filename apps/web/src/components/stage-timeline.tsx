"use client";
import { useEffect, useRef, useState } from "react";
import { connectedRequest, segment } from "@/lib/connected-api";

type Row = { revision: number; actor_uid: string; entry_id: string | null; position: string | null; held: boolean; recorded_at: number };
type Page = { items: Row[]; next_page: string | null };
export function StageTimeline({ base, stage, uid }: { base: string; stage: string; uid: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const generation = useRef(0);
  async function load(next?: string) {
    const request = ++generation.current;
    setLoading(true); setError("");
    try {
      const query = new URLSearchParams({ limit: "30", ...(next ? { cursor: next } : {}) });
      const page = await connectedRequest<Page>(`${base}/stages/${segment(stage)}/history?${query}`, undefined, "GET", uid);
      if (request !== generation.current) return;
      setRows(current => next ? [...current, ...page.items] : page.items); setCursor(page.next_page);
    } catch (reason) { if (request === generation.current) { setRows([]); setCursor(null); setError(reason instanceof Error ? reason.message : "Unable to load stage history."); } }
    finally { if (request === generation.current) setLoading(false); }
  }
  useEffect(() => { void load(); return () => { generation.current++; }; }, [base, stage, uid]);
  return <section className="panel stage-history" aria-labelledby="stage-history-heading"><h2 id="stage-history-heading">Stage history</h2><p className="fineprint">Oldest recorded change first. Actions before history recording began are unavailable.</p><button type="button" className="button button-outline" disabled={loading} style={{minHeight:56}} onClick={() => void load()}>Refresh history</button>{loading && <p role="status">Loading stage history…</p>}{error ? <p role="alert" className="form-error">{error}</p> : !loading && rows.length === 0 ? <p>No recorded changes for this stage.</p> : <ol className="connected-list">{rows.map(row => <li key={row.revision}><strong>Change {row.revision}</strong><p>{row.entry_id ? `Entry ${row.entry_id}: ${row.position?.replaceAll("_", " ")}` : row.held ? "Stage hold set" : "Stage hold released"}</p><p className="fineprint">By {row.actor_uid} · {new Date(row.recorded_at * 1000).toLocaleString()}</p></li>)}</ol>}{cursor && <button type="button" className="button button-outline" disabled={loading} style={{minHeight:56}} onClick={() => void load(cursor)}>Load more history</button>}</section>;
}
