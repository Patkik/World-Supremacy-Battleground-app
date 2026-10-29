"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Arrow, Brand, PageHeading, Status } from "@/components/ui";

export default function BattleJudgeVotePage({
  params,
}: {
  params: Promise<{ eventId: string; matchId: string }>;
}) {
  const { eventId, matchId } = use(params);

  const [vote, setVote] = useState<"red" | "blue" | "tie" | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const match = {
    id: matchId,
    round: "Quarterfinals - Match 2",
    red: { dancer: "Killa Kim", crew: "Philippine Allstars", country: "PH" },
    blue: { dancer: "Issei", crew: "Found Nation", country: "JPN" },
    currentRound: "Round 2 / Final Round",
  };

  const handleCastVote = (corner: "red" | "blue" | "tie") => {
    setVote(corner);
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 400);
  };

  return (
    <div className="judge-shell min-h-screen bg-obsidian text-chrome flex flex-col justify-between">
      <header className="judge-header p-4 border-b border-subtle flex justify-between items-center">
        <Brand />
        <div className="judge-event text-center">
          <strong>BG.ONE Live Battle Voting HUD</strong>
          <span className="mono text-xs text-titanium">
            {match.round} · {match.currentRound}
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
            description="Tap the corner of the dancer who dominated execution, musicality, and battle dynamics. Votes are cryptographically hashed and sent instantly to the master tally desk."
          />
        </div>

        {submitted ? (
          <div className="panel p-8 bg-carbon border-2 border-volt text-center space-y-4 rounded-xl">
            <Status tone="volt">VOTE RECORDED & LOCKED</Status>
            <h2 className="text-3xl font-extrabold text-chrome">
              Decision:{" "}
              <span
                className={
                  vote === "red"
                    ? "text-crimson"
                    : vote === "blue"
                    ? "text-blue-400"
                    : "text-amber"
                }
              >
                {vote === "red"
                  ? `RED CORNER (${match.red.dancer})`
                  : vote === "blue"
                  ? `BLUE CORNER (${match.blue.dancer})`
                  : "TIE / OVERTIME REQUESTED"}
              </span>
            </h2>
            <p className="mono text-xs text-titanium">
              OPERATION_ID: {matchId}_VOTE_0x{Date.now().toString(16).toUpperCase()}
            </p>
            <div className="pt-4">
              <button
                onClick={() => {
                  setSubmitted(false);
                  setVote(null);
                }}
                className="button button-secondary"
                style={{ minHeight: "48px" }}
              >
                Change Vote (Before MC Call)
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-auto">
            {/* RED CORNER BUTTON */}
            <button
              onClick={() => handleCastVote("red")}
              disabled={submitting}
              className="p-8 rounded-2xl bg-gradient-to-b from-crimson/30 to-crimson/10 border-2 border-crimson hover:bg-crimson/40 active:scale-[0.98] transition-all flex flex-col justify-between items-center text-center space-y-6 cursor-pointer"
              style={{ minHeight: "260px" }}
            >
              <span className="px-4 py-1 rounded bg-crimson text-white font-extrabold text-sm tracking-wider uppercase">
                Red Corner
              </span>
              <div>
                <h3 className="text-3xl md:text-4xl font-black text-white">{match.red.dancer}</h3>
                <p className="text-sm text-titanium mt-1">
                  {match.red.crew} · {match.red.country}
                </p>
              </div>
              <span className="mono text-xs text-titanium">TAP TO VOTE RED</span>
            </button>

            {/* BLUE CORNER BUTTON */}
            <button
              onClick={() => handleCastVote("blue")}
              disabled={submitting}
              className="p-8 rounded-2xl bg-gradient-to-b from-blue-600/30 to-blue-600/10 border-2 border-blue-500 hover:bg-blue-600/40 active:scale-[0.98] transition-all flex flex-col justify-between items-center text-center space-y-6 cursor-pointer"
              style={{ minHeight: "260px" }}
            >
              <span className="px-4 py-1 rounded bg-blue-600 text-white font-extrabold text-sm tracking-wider uppercase">
                Blue Corner
              </span>
              <div>
                <h3 className="text-3xl md:text-4xl font-black text-white">{match.blue.dancer}</h3>
                <p className="text-sm text-titanium mt-1">
                  {match.blue.crew} · {match.blue.country}
                </p>
              </div>
              <span className="mono text-xs text-titanium">TAP TO VOTE BLUE</span>
            </button>
          </div>
        )}

        {!submitted && (
          <div className="flex justify-center">
            <button
              onClick={() => handleCastVote("tie")}
              disabled={submitting}
              className="button button-secondary text-amber border-amber/40 hover:border-amber w-full max-w-md"
              style={{ minHeight: "52px" }}
            >
              Request Tie / Overtime Round
            </button>
          </div>
        )}
      </main>

      <footer className="p-4 border-t border-subtle text-center text-xs text-titanium mono">
        Accredited WSB Floor Node · Low-Latency Touch Interface
      </footer>
    </div>
  );
}
