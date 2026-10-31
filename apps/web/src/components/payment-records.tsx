"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useWorkspaceSession } from "@/lib/account";
import { connectedPage, connectedRequest, segment } from "@/lib/connected-api";
import type { PaymentRecord } from "@/lib/api";
import { PageHeading } from "./ui";

export function PaymentRecords({ chapterId }: { chapterId?: string }) {
  const { session, loading, error: sessionError } = useWorkspaceSession();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const permitted = !!session && (!chapterId || chapterId === session.chapter_id) && (!chapterId || ["finance", "chapter_director"].includes(session.role));
  const load = useCallback(async (next?: string | null) => {
    if (!session || !permitted) return;
    setBusy(true); setError("");
    try { const page = await connectedPage<PaymentRecord>(`/v1/chapters/${segment(session.chapter_id)}/finance/payments`, next); setPayments(previous => next ? [...previous, ...page.items] : page.items); setCursor(page.next_page); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load payments."); }
    finally { setBusy(false); }
  }, [session, permitted]);
  useEffect(() => { void load(); }, [load]);
  async function reconcile(id: string, approve: boolean) {
    if (!session) return;
    setBusy(true); setError("");
    try {
      const updated = await connectedRequest<PaymentRecord>(`/v1/chapters/${segment(session.chapter_id)}/finance/payments/${segment(id)}/reconcile`, { approve });
      setPayments(values => values.map(value => value.payment_id === id ? updated : value)); setReview(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to reconcile payment."); }
    finally { setBusy(false); }
  }
  return <main id="main-content" className="workspace-main"><PageHeading title={chapterId ? "Payment reconciliation" : "Your payment records"} description={chapterId ? "Approve only after checking the payment with your chapter’s bank or cash ledger." : "Payment status comes from the chapter ledger."} /><div className="connected-stack">
    {loading ? <p role="status">Checking access…</p> : !session ? <><p>{sessionError || "Sign in to view payments."}</p><Link href="/sign-in">Sign in</Link></> : !permitted ? <p className="form-error">Your account does not have finance access to this chapter.</p> : <>
      <button disabled={busy} className="button button-outline" onClick={() => void load()}>Refresh payment status</button>
      {!busy && payments.length === 0 && !error && <p>No payment records found.</p>}
      {payments.map(payment => <article key={payment.payment_id} className="panel"><h2>{payment.provider_reference}</h2><p className="mono">{new Intl.NumberFormat(undefined, { style: "currency", currency: payment.currency }).format(payment.amount_minor / 100)}</p><p>Status: <strong>{payment.status}</strong></p><p className="fineprint">Entry: {payment.entry_id}</p>
        {chapterId && payment.status === "pending" && (review === payment.payment_id ? <><p>Confirm the payer, amount and currency against the independent receipt before approving.</p><div className="connected-actions"><button disabled={busy} className="button button-volt" onClick={() => reconcile(payment.payment_id, true)}>Confirm verified payment</button><button disabled={busy} className="button button-outline" onClick={() => reconcile(payment.payment_id, false)}>Reject reference</button><button className="button button-outline" onClick={() => setReview(null)}>Cancel</button></div></> : <button className="button button-outline" onClick={() => setReview(payment.payment_id)}>Review reference</button>)}
      </article>)}
      {cursor && <button disabled={busy} className="button button-outline" onClick={() => void load(cursor)}>Load more payment records</button>}
    </>}{error && <p className="form-error" role="alert">{error}</p>}
  </div></main>;
}
