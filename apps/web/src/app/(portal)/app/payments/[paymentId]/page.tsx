"use client";

import { use } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status } from "@/components/ui";

export default function PaymentReceiptPage({
  params,
}: {
  params: Promise<{ paymentId: string }>;
}) {
  const { paymentId } = use(params);

  return (
    <main id="main-content" className="workspace-main">
      <PageHeading
        eyebrow={`Receipt #${paymentId} / Reconciled`}
        title="Official Payment Receipt"
        description="Official World Supremacy Battlegrounds championship entry transaction record."
        action={
          <div className="flex gap-2">
            <Link href="/app/payments" className="button button-outline">
              ← Payment History
            </Link>
            <button onClick={() => window.print()} className="button button-volt">
              Print / Save PDF <Arrow />
            </button>
          </div>
        }
      />

      <div className="max-w-2xl panel p-8 space-y-6">
        <div className="flex justify-between items-start border-b border-subtle pb-6">
          <div>
            <span className="eyebrow">WSB Philippines Chapter</span>
            <h2 className="text-2xl font-bold text-chrome">Payment Confirmation</h2>
            <p className="text-xs text-titanium mt-1">Transaction Ref: ref-pay-afterhours-1</p>
          </div>
          <Status tone="volt">PAID IN FULL</Status>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-titanium text-xs block mb-1">Billed To:</span>
            <strong className="text-chrome block">Afterhours Collective</strong>
            <span className="text-titanium text-xs">Manager: Kenji Ramos</span>
          </div>
          <div className="text-right">
            <span className="text-titanium text-xs block mb-1">Settlement Date:</span>
            <strong className="text-chrome block mono">July 02, 2027</strong>
            <span className="text-titanium text-xs">Payment ID: {paymentId}</span>
          </div>
        </div>

        <div className="border border-subtle rounded overflow-hidden">
          <div className="bg-tungsten p-3 text-xs font-bold text-titanium flex justify-between">
            <span>Description</span>
            <span>Amount</span>
          </div>
          <div className="p-4 flex justify-between items-center text-sm border-b border-subtle">
            <div>
              <strong className="text-chrome block">Manila Session 2027 · Open Crew Entry</strong>
              <span className="text-xs text-titanium">6 Registered Dancers × ₱1,200.00</span>
            </div>
            <strong className="mono text-chrome">₱7,200.00 PHP</strong>
          </div>
          <div className="bg-carbon p-4 flex justify-between items-center text-sm font-bold">
            <span className="text-chrome">Total Settled:</span>
            <span className="mono text-volt text-lg">₱7,200.00 PHP</span>
          </div>
        </div>

        <div className="p-4 bg-tungsten rounded border border-subtle text-xs text-titanium space-y-1">
          <strong className="text-chrome block mb-1">Authoritative Reconciled Ledger:</strong>
          <p>This transaction is permanently locked into the WSB minor currency unit financial ledger. Retain this receipt for venue check-in verification.</p>
        </div>
      </div>
    </main>
  );
}