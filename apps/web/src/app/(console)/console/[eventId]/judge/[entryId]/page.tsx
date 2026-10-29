"use client";

import { useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Arrow, Brand, Status } from "@/components/ui";

const criteria = [
  { name: "Choreography", hint: "Composition, formations, difficulty & originality" },
  { name: "Musicality", hint: "Rhythm syncopation, audio accents & dynamics" },
  { name: "Execution", hint: "Body control, synchronization & precision landings" },
  { name: "Stage Presence", hint: "Confidence, auditorium projection & energy" },
  { name: "Entertainment Value", hint: "Crowd engagement, theatricality & visual coherence" },
];

export default function EntryScorecardPage({
  params,
}: {
  params: Promise<{ eventId: string; entryId: string }>;
}) {
  const { eventId, entryId } = use(params);
  const router = useRouter();
  const [scores, setScores] = useState([18.5, 19.0, 18.0, 17.5, 19.0]);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("Local draft in memory");

  const total = scores.reduce((sum, val) => sum + val, 0);

  function changeScore(idx: number, val: number) {
    const clamped = Math.min(20, Math.max(0, Number.isFinite(val) ? val : 0));
    setScores((prev) => prev.map((s, i) => (i === idx ? clamped : s)));
    setStatus("Draft modified on device");
  }

  function handleProceedReview() {
    // Save draft in sessionStorage for review
    if (typeof window !== "undefined") {
      sessionStorage.setItem(`score-${entryId}`, JSON.stringify({ scores, notes, total }));
    }
    router.push(`/console/${eventId}/judge/review?entry_id=${entryId}`);
  }

  return (
    <div className="judge-shell">
      <header className="judge-header">
        <Brand />
        <div className="judge-event">
          <strong>Manila Session 2027</strong>
          <span>Judging Console #{eventId}</span>
        </div>
        <Link href={`/console/${eventId}/judge`} className="text-link">
          ← Lineup
        </Link>
      </header>

      <main id="main-content" className="judge-main">
        <div className="judge-performance">
          <div className="judge-entry-number">
            <span>Entry</span>
            <strong className="mono">014</strong>
          </div>
          <div className="judge-crew">
            <p className="eyebrow">Manila, Philippines · Open Crew</p>
            <h1>Afterhours Collective</h1>
            <p className="mono text-xs text-muted">ID: {entryId}</p>
          </div>
          <div className="judge-assignment">
            <span>Accredited Official</span>
            <strong>Judge 01</strong>
            <span>Active Scorecard</span>
          </div>
        </div>

        <div className="judge-workspace">
          <section className="criteria-panel" aria-label="Score criteria">
            <div className="criteria-heading">
              <h2>Official 100-Point Scoring Rubric</h2>
              <span className="mono">5 CRITERIA / 20.0 POINTS MAX EACH</span>
            </div>

            {criteria.map((c, i) => (
              <div className="criterion" key={c.name}>
                <div className="criterion-title">
                  <div>
                    <label htmlFor={`crit-${i}`} className="font-bold text-chrome">
                      {c.name}
                    </label>
                    <p className="text-xs text-titanium">{c.hint}</p>
                  </div>
                  <div className="criterion-numeric">
                    <input
                      id={`crit-${i}`}
                      type="number"
                      min={0}
                      max={20}
                      step={0.25}
                      value={scores[i]}
                      onChange={(e) => changeScore(i, Number(e.target.value))}
                      className="mono font-bold text-lg p-2 rounded bg-tungsten border border-subtle text-volt"
                    />
                    <span className="mono text-sm text-titanium">/ 20</span>
                  </div>
                </div>

                <div className="criterion-track">
                  <span className="mono">00</span>
                  <input
                    type="range"
                    min={0}
                    max={20}
                    step={0.25}
                    value={scores[i]}
                    onChange={(e) => changeScore(i, Number(e.target.value))}
                    style={{ "--progress": `${(scores[i] / 20) * 100}%` } as React.CSSProperties}
                  />
                  <span className="mono">20</span>
                </div>
              </div>
            ))}
          </section>

          <aside className="judge-score-summary">
            <span className="eyebrow">Calculated Total</span>
            <div className="judge-total mono">
              {total.toFixed(2)}
              <span>/ 100</span>
            </div>
            <div className="score-divider" />
            <p className="saved-state">
              <span className="status-dot" />
              {status}
            </p>

            <label htmlFor="judge-notes" className="text-xs font-bold text-chrome mt-4 block">
              Official Critique & Notes <span>Optional</span>
            </label>
            <textarea
              id="judge-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Constructive feedback for crew director..."
              rows={4}
              className="w-full p-3 rounded bg-tungsten border border-subtle text-chrome text-xs"
            />

            <button onClick={handleProceedReview} className="button button-volt w-full mt-4 justify-center">
              Review & Submit Score <Arrow />
            </button>
          </aside>
        </div>
      </main>
    </div>
  );
}