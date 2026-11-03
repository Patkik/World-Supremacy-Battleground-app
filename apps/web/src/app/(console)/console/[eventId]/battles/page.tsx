"use client";

import { use, useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Arrow, Brand, PageHeading, Status, Button, StatCard } from "@/components/ui";
import { ApiError, connectedPage, segment } from "@/lib/connected-api";
import { useWorkspaceSession, type WorkspaceSession } from "@/lib/account";

export interface BattleMatch {
  match_id: string;
  event_id: string;
  category: string;
  round: string;
  red_corner_name: string;
  blue_corner_name: string;
  votes_red: number;
  votes_blue: number;
  winner_corner: string | null;
  status: string;
}

function validMatch(value: unknown, eventId: string): value is BattleMatch {
  if (!value || typeof value !== "object") return false;
  const m = value as Partial<BattleMatch>;
  return m.event_id === eventId && typeof m.match_id === "string" && m.match_id.length > 0 && m.match_id.length <= 200 &&
    [m.category, m.round, m.red_corner_name, m.blue_corner_name].every(v => typeof v === "string" && v.length > 0 && v.length <= 200) &&
    Number.isSafeInteger(m.votes_red) && (m.votes_red as number) >= 0 && (m.votes_red as number) <= 5 &&
    Number.isSafeInteger(m.votes_blue) && (m.votes_blue as number) >= 0 && (m.votes_blue as number) <= 5 &&
    (m.votes_red as number) + (m.votes_blue as number) <= 5 && ["draft", "active", "live", "closed", "completed"].includes(m.status || "") &&
    (m.winner_corner === null || m.winner_corner === "red" || m.winner_corner === "blue") &&
    ((m.status === "closed" || m.status === "completed") ? m.winner_corner !== null : m.winner_corner === null);
}

export default function BattleControlPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const { session, loading: sessionLoading } = useWorkspaceSession();
  return <BattleDesk key={JSON.stringify([session?.uid ?? null, session?.chapter_id ?? null, eventId, sessionLoading])} eventId={eventId} session={session} sessionLoading={sessionLoading} />;
}

function BattleDesk({ eventId, session, sessionLoading }: { eventId: string; session: WorkspaceSession | null; sessionLoading: boolean }) {
  const [activeRound, setActiveRound] = useState("All");
  const [matches, setMatches] = useState<BattleMatch[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const generation = useRef(0);
  const loadBattles = useCallback(async (next?: string | null) => {
    const current = ++generation.current;
    if (sessionLoading) return;
    if (!session) { setMatches([]); setCursor(null); setError("Sign in with an assigned event account."); setLoading(false); return; }
    try {
      if (!next) { setMatches([]); setCursor(null); } setLoading(true);
      setError(null);
      const data = await connectedPage<BattleMatch>(
        `/v1/chapters/${segment(session.chapter_id)}/events/${segment(eventId)}/battles`, next, session.uid
      );
      if (!Array.isArray(data.items) || data.items.length > 100 || data.items.some(item => !validMatch(item, eventId)) || new Set(data.items.map(item => item.match_id)).size !== data.items.length || !(data.next_page === null || (typeof data.next_page === "string" && data.next_page.length > 0 && data.next_page.length <= 4096 && data.next_page !== next))) throw new Error("Battle page could not be verified. Refresh before continuing.");
      if (current === generation.current) { setMatches(previous => next ? [...previous, ...data.items.filter(item => !previous.some(existing => existing.match_id === item.match_id))] : data.items); setCursor(data.next_page); }
    } catch (err) {
      if (current === generation.current) { if (err instanceof ApiError && [401, 403].includes(err.status)) { setMatches([]); setCursor(null); } setError(err instanceof Error ? err.message : "Failed to load battles"); }
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, [eventId, session, sessionLoading]);

  useEffect(() => {
    void loadBattles();
    return () => { generation.current++; };
  }, [loadBattles]);

  const rounds = ["All", ...new Set(matches.map(match => match.round))];
  const filteredMatches = activeRound === "All"
    ? matches
    : matches.filter(
        (m) => m.round.toLowerCase() === activeRound.toLowerCase()
      );

  const activeCount = matches.filter(
    (m) => m.status === "active" || m.status === "live"
  ).length;
  const closedCount = matches.filter(
    (m) => m.status === "closed" || m.status === "completed"
  ).length;

  return (
    <div className="judge-shell">
      <header className="judge-header">
        <Brand />
        <div className="judge-event">
          <strong>BG.ONE Battle Control Desk</strong>
          <span>Event {eventId} · assigned match desk</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href={`/arena-live/${segment(eventId)}/bracket`} target="_blank" className="text-link">
            Arena Bracket Display <Arrow diagonal />
          </Link>
          <Link href="/console" className="text-link">
            Console Hub <Arrow diagonal />
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <PageHeading
            eyebrow="Battle judging"
            title="Battle matches"
            description="Review available matches and recorded decisions. Bracket progression is not connected."
          />
          <div className="flex flex-wrap gap-2">
            {rounds.map((r) => (
              <Button
                key={r}
                variant={activeRound === r ? "primary" : "secondary"}
                onClick={() => setActiveRound(r)}
                style={{ minHeight: "44px" }}
              >
                {r}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="Loaded matches" value={String(matches.length)} meta="Current pages" />
          <StatCard label="Live In Progress" value={String(activeCount)} meta="Awaiting decisions" tone="amber" />
          <StatCard label="Decisions Closed" value={String(closedCount)} meta="Majority reached" tone="volt" />
          <StatCard label="Updates" value="Manual" meta="Refresh to check" />
        </div>

        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-chrome">
            {activeRound === "All" ? "All Matches" : `${activeRound} Matches`}
          </h2>
          <Button
            variant="secondary"
            onClick={() => void loadBattles()}
            disabled={loading}
            style={{ minHeight: "40px" }}
          >
            {loading ? "Refreshing…" : "Refresh Battles"}
          </Button>
        </div>

        {error && (
          <div className="panel p-4 bg-crimson/10 border border-crimson rounded text-crimson text-sm">
            {error}
          </div>
        )}

        {loading && matches.length === 0 ? (
          <div className="panel p-12 text-center text-titanium">
            Loading battle fixtures…
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="panel p-12 text-center text-titanium space-y-2">
            <p>{cursor ? "No matching matches in the loaded pages. More pages are available." : error ? "Matches could not be loaded." : "No matching matches in the loaded pages."}</p>
            {activeRound !== "All" && (
              <Button variant="secondary" onClick={() => setActiveRound("All")}>
                View All Matches
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMatches.map((m) => {
              const isClosed = m.status === "closed" || m.status === "completed";
              const isActive = m.status === "active" || m.status === "live";
              const tone = isClosed ? "volt" : isActive ? "amber" : "neutral";
              const statusLabel = isClosed
                ? "Decision Reached (Closed)"
                : isActive
                ? "Live Voting Active"
                : m.status;

              const winnerText = m.winner_corner
                ? m.winner_corner === "red"
                  ? `Red (${m.red_corner_name})`
                  : `Blue (${m.blue_corner_name})`
                : null;

              return (
                <div
                  key={m.match_id}
                  className="panel p-6 bg-carbon border border-subtle flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6"
                >
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="mono text-xs text-titanium">{m.match_id}</span>
                      <span className="badge badge-neutral text-xs">{m.category} · {m.round}</span>
                      <Status tone={tone}>{statusLabel}</Status>
                      {winnerText && (
                        <span className="badge badge-volt text-xs">Winner: {winnerText}</span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-obsidian border-l-4 border-crimson rounded">
                        <span className="text-xs uppercase font-bold text-crimson">Red Corner</span>
                        <h4 className="text-lg font-bold text-chrome">{m.red_corner_name}</h4>
                        <div className="mt-2 mono text-sm text-chrome">
                          Tallied Votes: <strong className="text-crimson font-bold">{m.votes_red}</strong>
                        </div>
                      </div>

                      <div className="p-4 bg-obsidian border-l-4 border-blue-500 rounded">
                        <span className="text-xs uppercase font-bold text-blue-400">Blue Corner</span>
                        <h4 className="text-lg font-bold text-chrome">{m.blue_corner_name}</h4>
                        <div className="mt-2 mono text-sm text-chrome">
                          Tallied Votes: <strong className="text-blue-400 font-bold">{m.votes_blue}</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 w-full lg:w-auto">
                    <Link
                      href={`/console/${segment(eventId)}/battles/${segment(m.match_id)}/vote`}
                      className={`button ${isActive ? "button-volt" : "button-secondary"}`}
                      style={{ minHeight: "48px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                    >
                      {isClosed ? "View Decision" : "Judge Voting HUD"} <Arrow />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {cursor && <button type="button" className="button button-outline" disabled={loading} onClick={() => void loadBattles(cursor)}>{loading ? "Loading…" : "Load more matches"}</button>}
        <p className="fineprint">Counts and round filters cover loaded matches only. Refresh for current data.</p>
      </main>
    </div>
  );
}
