"use client";

import { use, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Arrow, Brand, PageHeading, Status, Button } from "@/components/ui";
import { ApiError, connectedRequest, segment } from "@/lib/connected-api";
import { useWorkspaceSession, type WorkspaceSession } from "@/lib/account";

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

function validBattle(value: unknown, eventId: string, matchId: string): value is BattleMatch {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<BattleMatch>;
  return record.event_id === eventId && record.match_id === matchId &&
    [record.category, record.round, record.red_corner_name, record.blue_corner_name].every(v => typeof v === "string" && v.length > 0 && v.length <= 200) &&
    Number.isSafeInteger(record.votes_red) && (record.votes_red as number) >= 0 && (record.votes_red as number) <= 5 &&
    Number.isSafeInteger(record.votes_blue) && (record.votes_blue as number) >= 0 && (record.votes_blue as number) <= 5 &&
    (record.votes_red as number) + (record.votes_blue as number) <= 5 &&
    ["draft", "active", "live", "closed", "completed"].includes(record.status || "") &&
    (record.winner_corner === null || record.winner_corner === "red" || record.winner_corner === "blue") &&
    ((record.status === "closed" || record.status === "completed") ? record.winner_corner !== null : record.winner_corner === null);
}

export default function BattleJudgeVotePage({
  params,
}: {
  params: Promise<{ eventId: string; matchId: string }>;
}) {
  const { eventId, matchId } = use(params);
  const { session, loading: sessionLoading } = useWorkspaceSession();
  return <BattleVoteWorkspace key={JSON.stringify([session?.uid ?? null, session?.chapter_id ?? null, eventId, matchId, sessionLoading])} eventId={eventId} matchId={matchId} session={session} sessionLoading={sessionLoading} />;
}

function BattleVoteWorkspace({ eventId, matchId, session, sessionLoading }: { eventId: string; matchId: string; session: WorkspaceSession | null; sessionLoading: boolean }) {
  const scope = useRef(0);
  const [battle, setBattle] = useState<BattleMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vote, setVote] = useState<"red" | "blue" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [pendingCorner, setPendingCorner] = useState<"red" | "blue" | null>(null);

  useEffect(() => {
    let active = true; scope.current++;
    async function loadMatch() {
      if (sessionLoading) return;
      setSubmitted(false); setSubmitting(false); setVote(null); setPendingCorner(null); setBattle(null);
      if (!session) { setError("Sign in with an assigned judge account."); setLoading(false); return; }
      try {
        setLoading(true);
        setError(null);
        const data = await connectedRequest<BattleMatch>(
          `/v1/chapters/${segment(session.chapter_id)}/events/${segment(eventId)}/battles/${segment(matchId)}`, undefined, "GET", session.uid
        );
        if (!validBattle(data, eventId, matchId)) throw new Error("Match details could not be verified. Refresh before voting.");
        const own = await connectedRequest<unknown>(`/v1/chapters/${segment(session.chapter_id)}/events/${segment(eventId)}/battles/${segment(matchId)}/my-ballot`, undefined, "GET", session.uid);
        if (!own || typeof own !== "object") throw new Error("Your ballot state could not be verified. Refresh before voting.");
        const ballot = own as { event_id?: unknown; match_id?: unknown; judge_uid?: unknown; corner?: unknown };
        if (ballot.event_id !== eventId || ballot.match_id !== matchId || ballot.judge_uid !== session.uid || ![null, "red", "blue"].includes(ballot.corner as null | string)) throw new Error("Your ballot state could not be verified. Refresh before voting.");
        if (active) {
          setBattle(data);
          if (ballot.corner === "red" || ballot.corner === "blue") { setVote(ballot.corner); setSubmitted(true); }
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
      active = false; scope.current++;
    };
  }, [eventId, matchId, session, sessionLoading]);

  const handleCastVote = async (corner: "red" | "blue") => {
    if (!session || !battle || submitted || submitting || (pendingCorner && pendingCorner !== corner) || (!pendingCorner && !["active", "live"].includes(battle.status))) return;
    const current = scope.current;
    setSubmitting(true);
    setPendingCorner(corner);
    setError(null);
    try {
      const updated = await connectedRequest<BattleMatch>(
        `/v1/chapters/${segment(session?.chapter_id ?? "")}/events/${segment(eventId)}/battles/${segment(matchId)}/vote`,
        { winner_corner: corner },
        "POST", session?.uid
      );
      if (!validBattle(updated, eventId, matchId) || updated.status === "draft" || (corner === "red" ? updated.votes_red : updated.votes_blue) < 1) throw new Error("The ballot response could not be verified.");
      if (current !== scope.current) return;
      setPendingCorner(null);
      setVote(corner);
      setBattle(updated);
      setSubmitted(true);
    } catch (err) {
      if (current === scope.current) {
        if (err instanceof ApiError && [400, 401, 403, 404, 409, 422].includes(err.status)) {
          setPendingCorner(null); setBattle(null); setError("The ballot was not confirmed. Refresh the match and check your assignment before continuing.");
        } else setError("The ballot result is uncertain. Retry the same corner to recover its receipt.");
      }
    } finally {
      if (current === scope.current) setSubmitting(false);
    }
  };

  const isClosed = battle?.status === "closed" || battle?.status === "completed";
  const displayCorner = submitted ? vote : battle?.winner_corner;
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
        <Link href={`/console/${segment(eventId)}/battles`} className="text-link">
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
        ) : !battle ? (
          <div className="panel" role="status">Match details are unavailable. Refresh this page before voting.</div>
        ) : pendingCorner && !submitted ? (
          <div className="panel"><p>Your {pendingCorner} ballot is awaiting confirmation. Retry the same corner.</p><button type="button" className="button button-volt" disabled={submitting} onClick={() => void handleCastVote(pendingCorner)}>{submitting ? "Checking…" : "Retry ballot"}</button></div>
        ) : submitted || isClosed ? (
          <div className="panel p-8 bg-carbon border-2 border-volt text-center space-y-4 rounded-xl">
            <Status tone="volt">
              {isClosed ? "BATTLE CLOSED · MAJORITY REACHED" : "VOTE RECORDED & LOCKED"}
            </Status>
            <h2 className="text-3xl font-extrabold text-chrome">
              {submitted ? "Your recorded ballot:" : "Match outcome:"}{" "}
              <span
                className={
                  displayCorner === "red"
                    ? "text-crimson"
                    : "text-blue-400"
                }
              >
                {displayCorner === "red"
                  ? `RED CORNER (${redName})`
                  : `BLUE CORNER (${blueName})`}
              </span>
            </h2>
            {battle && (
              <div className="mono text-sm text-titanium space-y-1">
                <p>
                  Recorded tally:{" "}
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
              MATCH_ID: {matchId} · {submitted ? "YOUR BALLOT ACKNOWLEDGED" : "VOTING CLOSED; YOUR BALLOT IS NOT CONFIRMED HERE"}
            </p>
            <div className="pt-2">
              <Link href={`/console/${segment(eventId)}/battles`} className="button button-outline inline-flex items-center">
                Return to Battle Desk
              </Link>
            </div>
          </div>
        ) : !["active", "live"].includes(battle.status) ? (
          <div className="panel" role="status">Voting has not opened for this match.</div>
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
