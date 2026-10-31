"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Arrow, Brand, PageHeading, Status, Button } from "@/components/ui";
import { connectedRequest, segment } from "@/lib/connected-api";

interface BattleMatch {
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

export default function BattleJudgeVotePage({
  params,
}: {
  params: Promise<{ eventId: string; matchId: string }>;
}) {
  const { eventId, matchId } = use(params);

  const [battle, setBattle] = useState<BattleMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vote, setVote] = useState<"red" | "blue" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadMatch() {
      try {
        setLoading(true);
        setError(null);
        const data = await connectedRequest<BattleMatch>(
          `/v1/events/${segment(eventId)}/battles/${segment(matchId)}`
        );
        if (active) {
          setBattle(data);
          if (data.status === "closed" || data.status === "completed") {
            setSubmitted(true);
            if (data.winner_corner === "red" || data.winner_corner === "blue") {
              setVote(data.winner_corner);
            }
          }
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load match details");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    void loadMatch();
    return () => {
      active = false;
    };
  }, [eventId, matchId]);

  const handleCastVote = async (corner: "red" | "blue") => {
    if (submitted || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await connectedRequest<BattleMatch>(
        `/v1/events/${segment(eventId)}/battles/${segment(matchId)}/vote`,
        { winner_corner: corner },
        "POST"
      );
      setVote(corner);
      setBattle(updated);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record ballot");
    } finally {
      setSubmitting(false);
    }
  };

  const isClosed = battle?.status === "closed" || battle?.status === "completed";
  const redName = battle?.red_corner_name || "Red Corner";
  const blueName = battle?.blue_corner_name || "Blue Corner";
  const categoryRound = battle
    ? `${battle.category} · ${battle.round}`
    : "BG.ONE Battle Match";

  return (
    <div className="judge-shell min-h-screen bg-obsidian text-chrome flex flex-col justify-between">
      <header className="judge-header p-4 border-b border-subtle flex justify-between items-center">
        <Brand />
        <div className="judge-event text-center">
          <strong>BG.ONE Live Battle Voting HUD</strong>
          <span className="mono text-xs text-titanium block">
            {matchId} · {categoryRound}
          </span>
        </div>
        <Link href={`/console/${eventId}/battles`} className="text-link">
          Battle Desk <Arrow diagonal />
        </Link>
      </header>

      <main className="max-w-4xl mx-auto w-full p-6 space-y-6 flex-1 flex flex-col justify-center">
        <div className="text-center space-y-2">
          <PageHeading
            eyebrow="Accredited Floor Decision"
            title="Cast Your Round Winner"
            description="Tap the corner of the dancer who dominated execution, musicality, and battle dynamics. Ballots are immutable once cast and automatically close upon majority decision."
          />
        </div>

        {error && (
          <div className="panel p-4 bg-crimson/10 border border-crimson rounded text-crimson text-center text-sm" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className="panel p-12 text-center text-titanium">
            Connecting to battle floor node…
          </div>
        ) : submitted || isClosed ? (
          <div className="panel p-8 bg-carbon border-2 border-volt text-center space-y-4 rounded-xl">
            <Status tone="volt">
              {isClosed ? "BATTLE CLOSED · MAJORITY REACHED" : "VOTE RECORDED & LOCKED"}
            </Status>
            <h2 className="text-3xl font-extrabold text-chrome">
              Decision:{" "}
              <span
                className={
                  vote === "red" || battle?.winner_corner === "red"
                    ? "text-crimson"
                    : "text-blue-400"
                }
              >
                {vote === "red" || battle?.winner_corner === "red"
                  ? `RED CORNER (${redName})`
                  : `BLUE CORNER (${blueName})`}
              </span>
            </h2>
            {battle && (
              <div className="mono text-sm text-titanium space-y-1">
                <p>
                  Official Tally:{" "}
                  <strong className="text-crimson">Red: {battle.votes_red}</strong> ·{" "}
                  <strong className="text-blue-400">Blue: {battle.votes_blue}</strong>
                </p>
                {battle.winner_corner && (
                  <p className="text-volt font-bold">
                    Declared Winner: {battle.winner_corner.toUpperCase()} CORNER
                  </p>
                )}
              </div>
            )}
            <p className="mono text-xs text-titanium">
              MATCH_ID: {matchId} · BALLOT IMMUTABLE
            </p>
            <div className="pt-2">
              <Link href={`/console/${eventId}/battles`} className="button button-outline inline-flex items-center">
                Return to Battle Desk
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-auto">
            {/* RED CORNER BUTTON */}
            <button
              onClick={() => void handleCastVote("red")}
              disabled={submitting}
              className="p-8 rounded-2xl bg-gradient-to-b from-crimson/30 to-crimson/10 border-2 border-crimson hover:bg-crimson/40 active:scale-[0.98] transition-all flex flex-col justify-between items-center text-center space-y-6 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ minHeight: "260px" }}
            >
              <span className="px-4 py-1 rounded bg-crimson text-white font-extrabold text-sm tracking-wider uppercase">
                Red Corner
              </span>
              <div>
                <h3 className="text-3xl md:text-4xl font-black text-white">{redName}</h3>
                <p className="text-sm text-titanium mt-1">
                  Tallied: {battle?.votes_red ?? 0}
                </p>
              </div>
              <span className="mono text-xs text-titanium">
                {submitting ? "RECORDING BALLOT…" : "TAP TO VOTE RED"}
              </span>
            </button>

            {/* BLUE CORNER BUTTON */}
            <button
              onClick={() => void handleCastVote("blue")}
              disabled={submitting}
              className="p-8 rounded-2xl bg-gradient-to-b from-blue-600/30 to-blue-600/10 border-2 border-blue-500 hover:bg-blue-600/40 active:scale-[0.98] transition-all flex flex-col justify-between items-center text-center space-y-6 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ minHeight: "260px" }}
            >
              <span className="px-4 py-1 rounded bg-blue-600 text-white font-extrabold text-sm tracking-wider uppercase">
                Blue Corner
              </span>
              <div>
                <h3 className="text-3xl md:text-4xl font-black text-white">{blueName}</h3>
                <p className="text-sm text-titanium mt-1">
                  Tallied: {battle?.votes_blue ?? 0}
                </p>
              </div>
              <span className="mono text-xs text-titanium">
                {submitting ? "RECORDING BALLOT…" : "TAP TO VOTE BLUE"}
              </span>
            </button>
          </div>
        )}
      </main>

      <footer className="p-4 border-t border-subtle text-center text-xs text-titanium mono">
        Accredited WSB Floor Node · Strict 2-Corner Majority Decision Rules
      </footer>
    </div>
  );
}
