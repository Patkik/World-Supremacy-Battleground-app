"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Arrow, Brand, PageHeading, Status } from "@/components/ui";

function PaymentReturnContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status") || "success";
  const entryId = searchParams.get("entry_id") || "entry-manila-open-1";

  const isSuccess = status === "success";

  return (
    <div className="max-w-md w-full panel p-8 text-center space-y-6">
      <Brand compact />

      <div className="space-y-2">
        <Status tone={isSuccess ? "volt" : "amber"}>
          {isSuccess ? "PAYMENT RECONCILED" : "TRANSACTION PENDING"}
        </Status>
        <h1 className="text-2xl font-bold text-chrome">
          {isSuccess ? "Registration Settled" : "Awaiting Gateway Confirmation"}
        </h1>
        <p className="text-sm text-titanium leading-relaxed">
          {isSuccess
            ? "Your division registration fee has been successfully processed and credited to the event ledger."
            : "Your payment authorization is being confirmed with the financial provider."}
        </p>
      </div>

      <div className="p-4 bg-tungsten rounded border border-subtle text-xs text-left space-y-2">
        <div className="flex justify-between">
          <span className="text-titanium">Entry Reference:</span>
          <strong className="mono text-chrome">{entryId}</strong>
        </div>
        <div className="flex justify-between">
          <span className="text-titanium">Ledger Status:</span>
          <strong className="mono text-volt">SETTLED</strong>
        </div>
      </div>

      <div className="pt-2 flex flex-col gap-3">
        <Link href={`/app/entries/${entryId}`} className="button button-volt w-full text-center">
          Return to Entry Status <Arrow />
        </Link>
        <Link href="/app/payments" className="button button-outline w-full text-center">
          View Payment Receipt
        </Link>
      </div>
    </div>
  );
}

export default function PaymentReturnPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-obsidian">
      <Suspense fallback={<div className="mono text-chrome">Confirming transaction...</div>}>
        <PaymentReturnContent />
      </Suspense>
    </main>
  );
}