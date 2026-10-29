"use client";

import { useState, use } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status } from "@/components/ui";

export default function EntryChangesPage({
  params,
}: {
  params: Promise<{ entryId: string }>;
}) {
  const { entryId } = use(params);
  const [reason, setReason] = useState("");
  const [actionType, setActionType] = useState<"division_switch" | "withdraw">("division_switch");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <main id="main-content" className="workspace-main">
      <PageHeading
        eyebrow={`Entry #${entryId} / Adjustments`}
        title="Entry Changes & Withdrawal"
        description="Request division changes, emergency dancer substitutions, or official entry withdrawal."
        action={
          <Link href={`/app/entries/${entryId}`} className="button button-outline">
            ← Back to Entry
          </Link>
        }
      />

      <div className="max-w-xl">
        <section className="panel">
          <div className="panel-heading">
            <h2>{submitted ? "Request Dispatched" : "Formal Change Request"}</h2>
          </div>

          {submitted ? (
            <div className="p-6 text-center space-y-4">
              <span className="text-4xl text-volt block">✓</span>
              <h3 className="text-xl font-bold text-chrome">Request Logged with Secretariat</h3>
              <p className="text-sm text-titanium">
                Your change notice has been transmitted to the Chapter Registrar. Roster changes within 48 hours of stage call require physical check-in at the venue desk.
              </p>
              <Link href={`/app/entries/${entryId}`} className="button button-volt">
                Return to Entry Overview
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div>
                <label className="block text-sm font-semibold text-chrome mb-1">Request Type</label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value as "division_switch" | "withdraw")}
                  className="w-full p-3 rounded bg-tungsten border border-subtle text-chrome focus:border-volt"
                >
                  <option value="division_switch">Switch Division (e.g. Open Crew to Monster Crew)</option>
                  <option value="withdraw">Formal Withdrawal from Championship</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-chrome mb-1">Reason for Change / Request</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  required
                  placeholder="Detail the technical or medical grounds for this adjustment..."
                  className="w-full p-3 rounded bg-tungsten border border-subtle text-chrome focus:border-volt"
                />
              </div>

              <button
                type="submit"
                className={`button ${actionType === "withdraw" ? "bg-crimson text-white hover:bg-crimson/90" : "button-volt"}`}
              >
                {actionType === "withdraw" ? "Submit Formal Withdrawal" : "Submit Change Request"} <Arrow />
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}