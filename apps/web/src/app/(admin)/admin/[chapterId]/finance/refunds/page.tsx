"use client";

import { useState, use } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status } from "@/components/ui";

export default function RefundsManagementPage({
  params,
}: {
  params: Promise<{ chapterId: string }>;
}) {
  const { chapterId } = use(params);
  const [refunds, setRefunds] = useState<Array<{ id: string; entryId: string; amount: string; reason: string; status: string }>>([]);
  const [showIssue, setShowIssue] = useState(false);
  const [paymentId, setPaymentId] = useState("");
  const [reason, setReason] = useState("");

  function handleIssueRefund(e: React.FormEvent) {
    e.preventDefault();
    setRefunds([
      ...refunds,
      {
        id: `ref-${Date.now()}`,
        entryId: "entry-manila-open-1",
        amount: "₱7,200.00 PHP",
        reason,
        status: "Refunded",
      },
    ]);
    setShowIssue(false);
    setPaymentId("");
    setReason("");
  }

  return (
    <main id="main-content" className="workspace-main">
      <PageHeading
        eyebrow={`Chapter / ${chapterId.toUpperCase()} / Finance`}
        title="Refunds & Chargebacks"
        description="Process authorized entry fee reversals and audit disputes."
        action={
          <div className="flex gap-2">
            <Link href={`/admin/${chapterId}/finance`} className="button button-outline">
              ← Finance
            </Link>
            <button onClick={() => setShowIssue(true)} className="button button-volt">
              + Issue Refund
            </button>
          </div>
        }
      />

      {showIssue && (
        <section className="panel mb-6 max-w-xl">
          <div className="panel-heading">
            <h2>Process Fee Refund</h2>
          </div>
          <form onSubmit={handleIssueRefund} className="space-y-4 pt-2">
            <div>
              <label className="block text-sm font-semibold text-chrome mb-1">Payment ID</label>
              <input
                type="text"
                value={paymentId}
                onChange={(e) => setPaymentId(e.target.value)}
                placeholder="e.g. pay-1001"
                required
                className="w-full p-3 rounded bg-tungsten border border-subtle text-chrome focus:border-volt"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-chrome mb-1">Reason / Authorization Note</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                placeholder="Medical withdrawal before official deadline..."
                className="w-full p-3 rounded bg-tungsten border border-subtle text-chrome focus:border-volt"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowIssue(false)} className="button button-outline text-xs">
                Cancel
              </button>
              <button type="submit" className="button button-volt text-xs">
                Authorize Reversal <Arrow />
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="panel roster-panel">
        <div className="panel-heading">
          <div>
            <h2>Reversed Entry Fees</h2>
            <p>Direct ledger subtractions matching bank adjustments</p>
          </div>
          <span className="mono text-volt font-bold">{refunds.length} Refunds</span>
        </div>

        {refunds.length === 0 ? (
          <div className="p-8 text-center text-titanium text-sm">
            Zero active chargebacks or refunds recorded for {chapterId.toUpperCase()} operations.
          </div>
        ) : (
          <div className="roster-table">
            <div className="roster-header">
              <span>Refund ID</span>
              <span>Entry Ref</span>
              <span>Reversed Amount</span>
              <span>Reason</span>
              <span>Status</span>
            </div>
            {refunds.map((r) => (
              <div className="roster-record" key={r.id}>
                <strong className="mono text-sm">{r.id}</strong>
                <span className="mono text-sm">{r.entryId}</span>
                <span className="mono text-crimson font-bold">{r.amount}</span>
                <span className="text-xs text-titanium">{r.reason}</span>
                <Status tone="amber">{r.status}</Status>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}