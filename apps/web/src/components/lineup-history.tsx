"use client";
import { useEffect, useRef, useState } from "react";
import { connectedRequest, segment } from "@/lib/connected-api";

type Row = { revision: number; updated_by: string; entry_ids: string[]; reason: string; updated_at: number };
type Page = { items: Row[]; next_page: string | null };
export function LineupHistory({ base, stage, uid }: { base: string; stage: string; uid: string }) {
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
      const page = await connectedRequest<Page>(`${base}/stages/${segment(stage)}/lineup-history?${query}`, undefined, "GET", uid);
      if (request !== generation.current) return;
      setRows(current => next ? [...current, ...page.items] : page.items); setCursor(page.next_page);
    } catch (reason) { if (request === generation.current) { setRows([]); setCursor(null); setError(reason instanceof Error ? reason.message : "Unable to load lineup history."); } }
    finally { if (request === generation.current) setLoading(false); }
  }
  useEffect(() => { void load(); return () => { generation.current++; }; }, [base, stage, uid]);
  return <section className="panel lineup-history" aria-labelledby="lineup-history-heading"><h2 id="lineup-history-heading">Lineup draft history</h2><p className="fineprint">Oldest recorded change first. Actions before history recording began are unavailable.</p><button type="button" className="button button-outline" disabled={loading} style={{minHeight:56}} onClick={() => void load()}>Refresh lineup history</button>{loading && <p role="status">Loading lineup history…</p>}{error ? <p role="alert" className="form-error">{error}</p> : !loading && rows.length === 0 ? <p>No saved lineup revisions.</p> : <ol className="connected-list">{rows.map(row => <li key={row.revision}><strong>Revision {row.revision}</strong><p>{row.entry_ids.length ? row.entry_ids.map((id, index) => `${index + 1}. ${id}`).join(" · ") : "Empty lineup"}</p><p>Reason: {row.reason}</p><p className="fineprint">By {row.updated_by} · {new Date(row.updated_at * 1000).toLocaleString()}</p></li>)}</ol>}{cursor && <button type="button" className="button button-outline" disabled={loading} style={{minHeight:56}} onClick={() => void load(cursor)}>Load more lineup history</button>}</section>;
}
