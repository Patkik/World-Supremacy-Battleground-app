"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useWorkspaceSession } from "@/lib/account";
import { connectedRequest, segment } from "@/lib/connected-api";
import type { PaymentQuote, PaymentRecord } from "@/lib/api";
import { LocalPaymongoCheckout } from "./local-paymongo-checkout";
import { PageHeading } from "./ui";

export function ConnectedCheckout({ entryId, eventId }: { entryId: string; eventId: string | null }) {
  const { session, loading, error: sessionError } = useWorkspaceSession();
  const scope = session && eventId ? JSON.stringify([session.uid, session.chapter_id, eventId, entryId]) : "";
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [quoteState, setQuote] = useState<{ scope: string; value: PaymentQuote } | null>(null);
  const quote = scope && quoteState?.scope === scope ? quoteState.value : null;
  const [reference, setReference] = useState(""); const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState(""); const [paymentState, setPayment] = useState<{ scope: string; value: PaymentRecord } | null>(null);
  const payment = scope && paymentState?.scope === scope ? paymentState.value : null;
  useEffect(() => {
    if (!session || !eventId) return;
    let alive = true; setError(""); setReference(""); setAmount(""); setPayment(null);
    connectedRequest<PaymentQuote>(`/v1/chapters/${segment(session.chapter_id)}/events/${segment(eventId)}/entries/${segment(entryId)}/quote`, undefined, "GET", session.uid).then(value => { if (alive) setQuote({scope, value}); }).catch(reason => { if (alive) setError(reason.message); });
    return () => { alive = false; };
  }, [session, entryId, eventId, refreshVersion]);
  const available = quote?.available_amount_minor;
  const balanceKnown = Number.isSafeInteger(available) && available! >= 0;
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!session || !eventId || !balanceKnown || available === 0) return;
    setBusy(true); setError("");
    try {
      let requestedAmount: number | undefined;
      if (amount.trim()) {
        if (!/^(0|[1-9]\d*)(\.\d{1,2})?$/.test(amount.trim())) throw new Error("Enter an amount with up to two decimal places.");
        const [whole, fraction = ""] = amount.trim().split(".");
        requestedAmount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
        if (!Number.isSafeInteger(requestedAmount) || requestedAmount <= 0) throw new Error("Enter a valid positive payment amount.");
      }
      const value = await connectedRequest<PaymentRecord>(`/v1/chapters/${segment(session.chapter_id)}/events/${segment(eventId)}/entries/${segment(entryId)}/pay`, { provider_reference: reference.trim(), amount_minor: requestedAmount }, "POST", session.uid);
      setPayment({scope, value});
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to submit payment reference."); }
    finally { setBusy(false); }
  }
  return <main id="main-content" className="workspace-main"><PageHeading title="Registration payment" description="Submit an existing bank or cash payment reference for chapter finance review." /><div className="connected-stack">
    {loading ? <p role="status">Checking access…</p> : !session ? <><p className="form-error">{sessionError || "Sign in to view your invoice."}</p><Link href="/sign-in">Sign in</Link></> : !eventId ? <p className="form-error">Open checkout from your event entry so its event can be verified.</p> : quote && <section className="panel"><h2>{quote.division_name}</h2><p>{quote.dancer_count} registered dancers</p><p>Full entry fee: <strong className="mono">{new Intl.NumberFormat(undefined, { style: "currency", currency: quote.currency }).format(quote.total_amount_minor / 100)}</strong></p>
      <p>Available balance for a new reference: <strong className="mono">{balanceKnown ? new Intl.NumberFormat(undefined, { style: "currency", currency: quote.currency }).format(available! / 100) : "Unavailable"}</strong></p>
      {payment ? <div role="status"><h3>{payment.status === "pending" ? "Awaiting finance review" : payment.status.replaceAll("_", " ")}</h3><p>Reference received: {payment.provider_reference}</p><p>This is a reconciliation request. Your entry is marked paid only after approval.</p></div> : <form onSubmit={submit}><label htmlFor="payment-reference">Bank or cash receipt reference<input id="payment-reference" required maxLength={200} value={reference} onChange={e => setReference(e.target.value)} /></label><label htmlFor="payment-amount">Your share ({quote.currency}, optional)<input id="payment-amount" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Leave blank for the available balance" /></label><button className="button button-volt" disabled={busy || !balanceKnown || available === 0}>{busy ? "Submitting…" : "Send for finance review"}</button></form>}
      <p className="info-note">Online gateway checkout is awaiting provider setup. This form does not charge a card or move money.</p></section>}
    {process.env.NEXT_PUBLIC_WSB_LOCAL_TESTING === "true" && session && eventId && <LocalPaymongoCheckout key={scope} chapter={session.chapter_id} eventId={eventId} entryId={entryId} uid={session.uid} onChanged={() => { setQuote(null); setRefreshVersion(value => value + 1); }}/>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </div></main>;
}
