"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Arrow, Brand, PageHeading, Status, Button, StatCard } from "@/components/ui";
import { connectedRequest, segment } from "@/lib/connected-api";

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

export default function BattleControlPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const [activeRound, setActiveRound] = useState("All");
  const [matches, setMatches] = useState<BattleMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBattles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await connectedRequest<BattleMatch[]>(
        `/v1/events/${segment(eventId)}/battles`
      );
      setMatches(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load battles");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void loadBattles();
  }, [loadBattles]);

  const rounds = ["All", "Top 16", "Quarterfinals", "Semifinals", "Finals", "Final"];
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
          <span>Event Desk #{eventId} · 1v1 World Bracket</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href={`/arena-live/${eventId}/bracket`} target="_blank" className="text-link">
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
            eyebrow="BG.ONE Street Dance Championship"
            title="Tournament Bracket & Match Dispatch"
            description="Manage live rounds, monitor corner judge tallies, and verify corner decisions on the official battle tree."
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
          <StatCard label="Total Battles" value={String(matches.length)} meta={`${activeRound} view`} />
          <StatCard label="Live In Progress" value={String(activeCount)} meta="Awaiting decisions" tone="amber" />
          <StatCard label="Decisions Closed" value={String(closedCount)} meta="Majority reached" tone="volt" />
          <StatCard label="Sync Engine" value="Real-time" meta="Authoritative node" />
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
            <p>No battles scheduled for {activeRound}.</p>
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
                      href={`/console/${eventId}/battles/${m.match_id}/vote`}
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
      </main>
    </div>
  );
}
