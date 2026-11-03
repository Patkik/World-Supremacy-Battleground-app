"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status } from "@/components/ui";
import { useWorkspaceSession } from "@/lib/account";
import { ApiError, connectedRequest, segment } from "@/lib/connected-api";
import type { PaymentRecord } from "@/lib/api";
import { formatMinorCurrency } from "@/lib/money";

function paymentError(error: unknown) {
  if (error instanceof ApiError && error.status === 401) return "Your session expired. Sign in again to view this payment record.";
  if (error instanceof ApiError && error.status === 403) return "This payment record belongs to another account.";
  if (error instanceof ApiError && error.status === 404) return "This payment record was not found in the selected chapter.";
  if (error instanceof ApiError && error.status === 501) return "Payment records are not available in this storage mode.";
  if (error instanceof ApiError && error.status === 503) return "Payment storage is unavailable. Try again when the service is available.";
  return error instanceof Error ? error.message : "Unable to load this payment record.";
}

function dateLabel(seconds: number | undefined) {
  if (seconds === undefined) return "Not recorded";
  const date = new Date(seconds * 1000);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : "Invalid saved timestamp";
}

export default function PaymentReceiptPage({
  params,
}: {
  params: Promise<{ paymentId: string }>;
}) {
  const { paymentId } = use(params);
  const { session, loading: sessionLoading, error: sessionError } = useWorkspaceSession();
  const [payment, setPayment] = useState<PaymentRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (!session) {
      setPayment(null);
      return () => { active = false; };
    }
    setLoading(true);
    setError("");
    connectedRequest<PaymentRecord>(
      `/v1/chapters/${segment(session.chapter_id)}/finance/payments/${segment(paymentId)}`,
      undefined,
      "GET",
      session.uid,
    )
      .then(record => { if (active) setPayment(record); })
      .catch(cause => { if (active) setError(paymentError(cause)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [paymentId, session]);

  const settled = payment?.status === "settled";
  const statusTone = payment?.status === "settled" ? "volt" : payment?.status === "pending" ? "neutral" : "crimson";

  return (
    <main id="main-content" className="workspace-main">
      <PageHeading
        eyebrow={payment ? `Payment record / ${payment.payment_id}` : "Payment record"}
        title="Payment record"
        description="View the saved status and amount from the chapter payment ledger."
        action={
          <div className="flex gap-2">
            <Link href="/app/payments" className="button button-outline">Payment history</Link>
            {settled && <button onClick={() => window.print()} className="button button-volt">Print ledger record <Arrow /></button>}
          </div>
        }
      />

      {sessionLoading ? <p role="status">Checking chapter access…</p>
        : !session ? <section className="panel"><p role="alert">{sessionError || "Sign in to view this payment record."}</p><Link href="/sign-in" className="button button-volt">Sign in</Link></section>
          : loading ? <p role="status">Loading payment record…</p>
            : error ? <section className="panel" role="alert"><p className="form-error">{error}</p><button type="button" className="button button-outline" onClick={() => window.location.reload()}>Retry</button></section>
              : payment ? <article className="max-w-2xl panel p-6 sm:p-8">
                <div className="panel-heading">
                  <div><p className="eyebrow">Chapter ledger / {payment.chapter_id}</p><h2>Saved transaction details</h2></div>
                  <Status tone={statusTone}>{payment.status.replaceAll("_", " ")}</Status>
                </div>
                <p className="mono text-2xl text-chrome">{formatMinorCurrency(payment.amount_minor, payment.currency)}</p>
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div><dt className="eyebrow">Payment record ID</dt><dd className="break-all font-mono">{payment.payment_id}</dd></div>
                  <div><dt className="eyebrow">Entry ID</dt><dd className="break-all font-mono">{payment.entry_id}</dd></div>
                  <div><dt className="eyebrow">Reference</dt><dd className="break-all font-mono">{payment.provider_reference}</dd></div>
                  <div><dt className="eyebrow">Currency</dt><dd className="font-mono">{payment.currency}</dd></div>
                  <div><dt className="eyebrow">Record created</dt><dd>{dateLabel(payment.created_at)}</dd></div>
                  <div><dt className="eyebrow">Ledger settlement time</dt><dd>{dateLabel(payment.settled_at)}</dd></div>
                </dl>
                <p className="mt-6 text-sm text-[var(--ink-muted)]">
                  This is the WSB ledger record. It is not a bank or payment-provider receipt, and a return from checkout alone does not confirm settlement.
                </p>
              </article> : null}
    </main>
  );
}
