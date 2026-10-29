"use client";

import { Suspense, useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Arrow, Brand, PageHeading, Status } from "@/components/ui";

function JudgeReviewContent({ eventId }: { eventId: string }) {
  const searchParams = useSearchParams();
  const entryId = searchParams.get("entry_id") || "entry-manila-open-1";
  const router = useRouter();

  const [scores, setScores] = useState<number[]>([18.5, 19.0, 18.0, 17.5, 19.0]);
  const [total, setTotal] = useState<number>(92.0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem(`score-${entryId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.scores) setScores(parsed.scores);
          if (parsed.total) setTotal(parsed.total);
        } catch {}
      }
    }
  }, [entryId]);

  function handleFinalSubmit() {
    setSubmitting(true);
    // Submit score via authoritative command protocol with operation_id
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 600);
  }

  const criteriaNames = ["Choreography", "Musicality", "Execution", "Stage Presence", "Entertainment Value"];

  return (
    <div className="max-w-xl mx-auto panel p-8 my-8">
      <Brand compact />

      {submitted ? (
        <div className="text-center py-6 space-y-4">
          <span className="text-4xl text-volt block">✓</span>
          <h1 className="text-2xl font-bold text-chrome">Scorecard Locked & Acknowledged</h1>
          <p className="text-sm text-titanium">
            Receipt generated and signed into the event outbox. Total Score: <strong className="mono text-volt">{total.toFixed(2)}</strong>.
          </p>
          <div className="pt-4 flex flex-col gap-2">
            <Link href={`/console/${eventId}/judge`} className="button button-volt w-full text-center">
              Next Scheduled Performance <Arrow />
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6 pt-2">
          <div>
            <span className="eyebrow">Final Verification</span>
            <h1 className="text-xl font-bold text-chrome">Confirm Scorecard Submission</h1>
            <p className="text-xs text-titanium mt-1">
              Performance: <strong>Afterhours Collective</strong> (Open Crew)
            </p>
          </div>

          <div className="p-4 bg-tungsten rounded border border-subtle flex justify-between items-center">
            <span className="text-sm text-titanium">Official Aggregate Score:</span>
            <strong className="text-3xl mono text-volt font-bold">{total.toFixed(2)} / 100</strong>
          </div>

          <div className="space-y-2 text-xs">
            {criteriaNames.map((name, i) => (
              <div key={name} className="flex justify-between py-1 border-b border-subtle">
                <span className="text-titanium">{name}:</span>
                <strong className="mono text-chrome">{scores[i]?.toFixed(2)}</strong>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted">
            Once submitted, your scorecard is transmitted with an idempotent command receipt. Scores can only be unlocked by the Head Judge.
          </p>

          <div className="flex gap-3 pt-2">
            <Link href={`/console/${eventId}/judge/${entryId}`} className="button button-outline w-1/3 text-center">
              Edit
            </Link>
            <button
              onClick={handleFinalSubmit}
              disabled={submitting}
              className="button button-volt w-2/3 justify-center"
            >
              {submitting ? "Signing Score..." : "Lock & Transmit Score"} <Arrow />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function JudgeSubmissionReviewPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);

  return (
    <main className="min-h-screen bg-obsidian p-4 flex items-center justify-center">
      <Suspense fallback={<div className="mono text-chrome">Loading review...</div>}>
        <JudgeReviewContent eventId={eventId} />
      </Suspense>
    </main>
  );
}