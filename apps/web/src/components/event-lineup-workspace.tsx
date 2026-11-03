"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useWorkspaceSession } from "@/lib/account";
import { connectedRequest, segment } from "@/lib/connected-api";
import { PageHeading } from "@/components/ui";
import { StageLineup } from "@/components/stage-lineup";
import { LineupHistory } from "@/components/lineup-history";

type Stage = { stage_id: string; active: boolean; held: boolean; performing_entry: string | null };
type Page<T> = { items: T[]; next_page: string | null };

export function EventLineupWorkspace({ chapterId, eventId }: { chapterId: string; eventId: string }) {
  const { session, loading: sessionLoading, error: sessionError } = useWorkspaceSession(chapterId);
  const base = `/v1/chapters/${segment(chapterId)}/events/${segment(eventId)}`;
  const [stages, setStages] = useState<Stage[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [stage, setStage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(0);
  const allowed = !!session && session.chapter_id === chapterId && ["chapter_director", "marshal"].includes(session.role);
  const director = !!session && session.role === "chapter_director";

  const load = useCallback(async (next?: string) => {
    if (!session) return;
    const current = ++request.current;
    setLoading(true); setError("");
    try {
      const query = new URLSearchParams({ limit: "50", ...(next ? { cursor: next } : {}) });
      const page = await connectedRequest<Page<Stage>>(`${base}/stages?${query}`, undefined, "GET", session.uid);
      if (current !== request.current) return;
      setStages(previous => next ? [...previous, ...page.items] : page.items);
      setCursor(page.next_page);
      if (!next) setStage(previous => page.items.some(item => item.stage_id === previous) ? previous : page.items[0]?.stage_id || "");
    } catch (reason) {
      if (current === request.current) setError(reason instanceof Error ? reason.message : "Unable to load stages.");
    } finally { if (current === request.current) setLoading(false); }
  }, [base, session]);
  useEffect(() => { setStages([]); setCursor(null); setStage(""); if (allowed) void load(); return () => { request.current++; }; }, [allowed, load]);

  return <main id="main-content" className="workspace-main">
    <PageHeading
      eyebrow={`Chapter / ${chapterId.toUpperCase()} / Events`}
      title="Performance lineup"
      description="Plan the internal per-stage entry order. A lineup draft is not published to crews, sends no notifications and does not start performances."
      action={<Link href={`/admin/${segment(chapterId)}/events/${segment(eventId)}`} className="button button-outline">Event command center</Link>}
    />
    {sessionLoading ? <p role="status">Checking chapter access…</p>
      : !session ? <p role="alert" className="form-error">{sessionError || "Sign in with your chapter account to continue."}</p>
        : !allowed ? <p role="alert" className="form-error">The lineup workspace is available to a chapter director or an assigned marshal for this chapter.</p>
          : <>
            <section className="panel" aria-labelledby="lineup-stage-heading">
              <div className="connected-actions"><h2 id="lineup-stage-heading">Stage</h2><button type="button" className="button button-outline" disabled={loading} onClick={() => void load()}>Refresh stages</button></div>
              {loading && stages.length === 0 ? <p role="status">Loading stages…</p>
                : stages.length === 0 ? <p>{error ? "The stage list is unavailable." : "No stages are configured for this event. A chapter director creates stages in the marshal workspace."}</p>
                  : <><label htmlFor="lineup-stage">Configured stage</label>
                    <select id="lineup-stage" value={stage} onChange={event => setStage(event.target.value)}>
                      {stages.map(item => <option key={item.stage_id} value={item.stage_id}>{item.stage_id}{item.active ? "" : " (inactive)"}{item.held ? " · held" : ""}{item.performing_entry ? " · performing" : ""}</option>)}
                    </select></>}
              {cursor && <button type="button" className="button button-outline" disabled={loading} onClick={() => void load(cursor)}>Load more stages</button>}
              {error && stages.length > 0 && <p role="alert" className="form-error">{error}</p>}
            </section>
            {stage && <StageLineup key={JSON.stringify(["lineup", base, stage, session.uid])} base={base} stage={stage} uid={session.uid} director={director} />}
            {stage && <LineupHistory key={JSON.stringify(["lineup-history", base, stage, session.uid])} base={base} stage={stage} uid={session.uid} />}
            <p className="fineprint">Saving a draft requires a held stage with no active performance and approved entries only. Move entries through stage positions in the marshal workspace.</p>
            <Link className="text-link" href={`/console/${segment(eventId)}/marshal`}>Open the marshal workspace</Link>
          </>}
  </main>;
}
