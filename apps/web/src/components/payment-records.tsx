"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useWorkspaceSession, type WorkspaceSession } from "@/lib/account";
import { ApiError, connectedPage, segment } from "@/lib/connected-api";
import { registrationCommand } from "@/lib/registration-command";
import type { PaymentRecord } from "@/lib/api";
import { formatMinorCurrency } from "@/lib/money";
import { PageHeading } from "./ui";

type PaymentMode = "reconcile" | "refund";

export function PaymentRecords({ chapterId, mode = "reconcile" }: { chapterId?: string; mode?: PaymentMode }) {
  const { session, loading, error: sessionError } = useWorkspaceSession();
  const heading = mode === "refund" ? "Manual payment refunds" : chapterId ? "Payment reconciliation" : "Your payment records";
  const description = mode === "refund"
    ? "Record a full reversal only after the manual bank or cash refund is independently confirmed. This does not initiate a provider refund."
    : chapterId ? "Approve only after checking the payment with your chapter’s bank or cash ledger." : "Payment status comes from the chapter ledger.";
  if (!session) return <main id="main-content" className="workspace-main"><PageHeading title={heading} description={description} />{loading ? <p role="status">Checking access…</p> : <section className="connected-stack"><p>{sessionError || "Sign in to view payments."}</p><Link href="/sign-in">Sign in</Link></section>}</main>;
  return <PaymentWorkspace key={`${session.uid}:${session.chapter_id}:${chapterId}:${mode}`} session={session} chapterId={chapterId} mode={mode} heading={heading} description={description} />;
}

function PaymentWorkspace({ session, chapterId, mode, heading, description }: { session: WorkspaceSession; chapterId?: string; mode: PaymentMode; heading: string; description: string }) {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<string | null>(null);
  const [refundReview, setRefundReview] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const generation = useRef(0);
  const permitted = !!session
    && (!chapterId || chapterId === session.chapter_id)
    && (!chapterId || ["finance", "chapter_director"].includes(session.role));

  const load = useCallback(async (next?: string | null) => {
    if (!session || !permitted) return;
    const current = ++generation.current;
    setBusy(true);
    setError("");
    try {
      const page = await connectedPage<PaymentRecord>(
        `/v1/chapters/${segment(session.chapter_id)}/finance/payments`,
        next,
        session.uid,
      );
      if (!Array.isArray(page.items) || page.items.some(payment => payment.chapter_id !== session.chapter_id || (!chapterId && payment.payer_uid !== session.uid)) || (page.next_page !== null && typeof page.next_page !== "string")) throw new Error("Payment response could not be verified for this account and chapter.");
      if (current === generation.current) { setPayments(previous => next ? [...previous, ...page.items] : page.items); setCursor(page.next_page); }
    } catch (cause) {
      if (current === generation.current) {
        if (cause instanceof ApiError && [401, 403].includes(cause.status)) { setPayments([]); setCursor(null); }
        setError(cause instanceof Error ? cause.message : "Unable to load payments.");
      }
    } finally {
      if (current === generation.current) setBusy(false);
    }
  }, [session, permitted, chapterId]);

  useEffect(() => { void load(); return () => { generation.current++; }; }, [load]);

  async function reconcile(id: string, approve: boolean) {
    if (!session) return;
    const current = ++generation.current;
    setBusy(true);
    setError("");
    try {
      const updated = await registrationCommand<PaymentRecord>(
        `/v1/chapters/${segment(session.chapter_id)}/finance/payments/${segment(id)}/reconcile`,
        { approve, reason: reason.trim() },
        "POST",
        false,
        session.uid,
      );
      if (updated.payment_id !== id || updated.chapter_id !== session.chapter_id || (!chapterId && updated.payer_uid !== session.uid)) throw new Error("Updated payment response could not be verified for this account and chapter.");
      if (current === generation.current) { setPayments(values => values.map(value => value.payment_id === id ? updated : value)); setReview(null); setReason(""); }
    } catch (cause) {
      if (current === generation.current) setError(cause instanceof Error ? cause.message : "Unable to reconcile payment.");
    } finally {
      if (current === generation.current) setBusy(false);
    }
  }

  async function refund(id: string) {
    if (!session) return;
    const current = ++generation.current;
    setBusy(true);
    setError("");
    try {
      const updated = await registrationCommand<PaymentRecord>(
        `/v1/chapters/${segment(session.chapter_id)}/finance/payments/${segment(id)}/refund`,
        { reason: reason.trim() },
        "POST",
        false,
        session.uid,
      );
      if (updated.payment_id !== id || updated.chapter_id !== session.chapter_id || (!chapterId && updated.payer_uid !== session.uid)) throw new Error("Updated payment response could not be verified for this account and chapter.");
      if (current === generation.current) { setPayments(values => values.map(value => value.payment_id === id ? updated : value)); setRefundReview(null); setReason(""); }
    } catch (cause) {
      if (current === generation.current) setError(cause instanceof Error ? cause.message : "Unable to record the manual ledger refund.");
    } finally {
      if (current === generation.current) setBusy(false);
    }
  }

  return (
    <main id="main-content" className="workspace-main">
      <PageHeading
        title={heading}
        description={description}
        action={chapterId ? (
          <Link
            className="button button-outline"
            href={mode === "refund" ? `/admin/${segment(chapterId)}/finance/transactions` : `/admin/${segment(chapterId)}/finance/refunds`}
          >
            {mode === "refund" ? "Payment reconciliation" : "Manual refunds"}
          </Link>
        ) : undefined}
      />
      <div className="connected-stack">
        {!permitted ? (
          <p className="form-error">Your account does not have finance access to this chapter.</p>
        ) : (
          <>
            <button disabled={busy} className="button button-outline" onClick={() => void load()}>
              Refresh payment status
            </button>
            {!busy && payments.length === 0 && !error && <p>No payment records found.</p>}
            {payments.map(payment => {
              const isProviderPayment = /^(pay_|cs_)/.test(payment.provider_reference);
              return (
                <article key={payment.payment_id} className="panel">
                  <h2>{payment.provider_reference}</h2>
                  <p className="mono">{formatMinorCurrency(payment.amount_minor, payment.currency)}</p>
                  <p>Status: <strong>{payment.status}</strong></p>
                  <p className="fineprint">Entry: {payment.entry_id}</p>
                  <Link className="text-link" href={`/app/payments/${segment(payment.payment_id)}`}>
                    View saved payment record <span aria-hidden="true">→</span>
                  </Link>

                  {mode === "reconcile" && chapterId && payment.status === "pending" && (
                    review === payment.payment_id ? (
                      <section className="connected-stack">
                        <p>Confirm the payer, amount and currency against the independent receipt before deciding. Add a concise reason without bank or card details.</p>
                        <label htmlFor={`reconcile-reason-${payment.payment_id}`}>Reason for this reconciliation decision</label>
                        <input
                          id={`reconcile-reason-${payment.payment_id}`}
                          type="text"
                          minLength={8}
                          maxLength={1000}
                          required
                          value={reason}
                          onChange={event => setReason(event.target.value)}
                          disabled={busy}
                        />
                        <div className="connected-actions">
                          <button disabled={busy || reason.trim().length < 8} className="button button-volt" onClick={() => void reconcile(payment.payment_id, true)}>Confirm verified payment</button>
                          <button disabled={busy || reason.trim().length < 8} className="button button-outline" onClick={() => void reconcile(payment.payment_id, false)}>Reject reference</button>
                          <button disabled={busy} className="button button-outline" onClick={() => { setReview(null); setReason(""); }}>Cancel</button>
                        </div>
                      </section>
                    ) : (
                      <button className="button button-outline" onClick={() => { setReview(payment.payment_id); setRefundReview(null); setReason(""); }}>Review reference</button>
                    )
                  )}

                  {mode === "refund" && chapterId && payment.status === "settled" && (
                    refundReview === payment.payment_id ? (
                      <section className="connected-stack">
                        <p>Continue only after the full manual bank or cash reversal is independently confirmed. No provider call will be made. Do not enter payment account details below.</p>
                        {isProviderPayment ? (
                          <p className="form-error">Provider-linked refunds are unavailable here pending the verified PayMongo refund and reconciliation workflow.</p>
                        ) : (
                          <>
                            <label htmlFor={`refund-reason-${payment.payment_id}`}>Reason and non-sensitive confirmation reference</label>
                            <input
                              id={`refund-reason-${payment.payment_id}`}
                              type="text"
                              minLength={8}
                              maxLength={1000}
                              required
                              value={reason}
                              onChange={event => setReason(event.target.value)}
                              disabled={busy}
                            />
                            <div className="connected-actions">
                              <button disabled={busy || reason.trim().length < 8} className="button button-volt" onClick={() => void refund(payment.payment_id)}>Record full manual refund</button>
                              <button disabled={busy} className="button button-outline" onClick={() => { setRefundReview(null); setReason(""); }}>Cancel</button>
                            </div>
                          </>
                        )}
                      </section>
                    ) : (
                      <button className="button button-outline" onClick={() => { setRefundReview(payment.payment_id); setReview(null); setReason(""); }}>Review manual refund</button>
                    )
                  )}
                </article>
              );
            })}
            {cursor && <button disabled={busy} className="button button-outline" onClick={() => void load(cursor)}>Load more payment records</button>}
          </>
        )}
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
    </main>
  );
}
