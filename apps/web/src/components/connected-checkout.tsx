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
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [onlineBusy, setOnlineBusy] = useState(false);
  const [onlineNotice, setOnlineNotice] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [paymentState, setPayment] = useState<{ scope: string; value: PaymentRecord } | null>(null);
  const payment = scope && paymentState?.scope === scope ? paymentState.value : null;

  useEffect(() => {
    if (!session || !eventId) return;
    let alive = true;
    setError("");
    setReference("");
    setAmount("");
    setPayment(null);
    connectedRequest<PaymentQuote>(
      `/v1/chapters/${segment(session.chapter_id)}/events/${segment(eventId)}/entries/${segment(entryId)}/quote`,
      undefined,
      "GET",
      session.uid
    )
      .then((value) => {
        if (alive) setQuote({ scope, value });
      })
      .catch((reason) => {
        if (alive) setError(reason.message);
      });
    return () => {
      alive = false;
    };
  }, [session, entryId, eventId, refreshVersion, scope]);

  const available = quote?.available_amount_minor;
  const balanceKnown = Number.isSafeInteger(available) && available! >= 0;

  function parseRequestedAmount(): number | undefined {
    if (!amount.trim()) return undefined;
    if (!/^(0|[1-9]\d*)(\.\d{1,2})?$/.test(amount.trim())) {
      throw new Error("Enter an amount with up to two decimal places.");
    }
    const [whole, fraction = ""] = amount.trim().split(".");
    const requested = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
    if (!Number.isSafeInteger(requested) || requested <= 0) {
      throw new Error("Enter a valid positive payment amount.");
    }
    return requested;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!session || !eventId || !balanceKnown || available === 0) return;
    setBusy(true);
    setError("");
    try {
      const requestedAmount = parseRequestedAmount();
      const value = await connectedRequest<PaymentRecord>(
        `/v1/chapters/${segment(session.chapter_id)}/events/${segment(eventId)}/entries/${segment(entryId)}/pay`,
        { provider_reference: reference.trim(), amount_minor: requestedAmount },
        "POST",
        session.uid
      );
      setPayment({ scope, value });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to submit payment reference.");
    } finally {
      setBusy(false);
    }
  }

  async function startOnlinePaymongo() {
    if (!session || !eventId || !balanceKnown || available === 0) return;
    setOnlineBusy(true);
    setError("");
    setOnlineNotice("");
    try {
      const requestedAmount = parseRequestedAmount();
      const opId = crypto.randomUUID();
      const res = await connectedRequest<{
        checkout_url?: string;
        session_id?: string;
        reference_number?: string;
      }>(
        `/v1/chapters/${segment(session.chapter_id)}/events/${segment(eventId)}/entries/${segment(entryId)}/paymongo/checkout`,
        { operation_id: opId, amount_minor: requestedAmount },
        "POST",
        session.uid
      );
      if (res.checkout_url && !res.checkout_url.includes("/local")) {
        window.location.href = res.checkout_url;
      } else {
        setOnlineNotice("Test session initialized. Use the simulation panel below to settle or cancel.");
        setRefreshVersion((v) => v + 1);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "PayMongo checkout unavailable.");
    } finally {
      setOnlineBusy(false);
    }
  }

  return (
    <main id="main-content" className="workspace-main">
      <PageHeading
        title="Registration payment"
        description="Pay fees online with PayMongo (Cards, GCash, Maya) or submit a bank/cash payment reference."
      />
      <div className="connected-stack">
        {loading ? (
          <p role="status">Checking access…</p>
        ) : !session ? (
          <>
            <p className="form-error">{sessionError || "Sign in to view your invoice."}</p>
            <Link href="/sign-in">Sign in</Link>
          </>
        ) : !eventId ? (
          <p className="form-error">Open checkout from your event entry so its event can be verified.</p>
        ) : (
          quote && (
            <section className="panel">
              <h2>{quote.division_name}</h2>
              <p>{quote.dancer_count} registered dancers</p>
              <p>
                Full entry fee:{" "}
                <strong className="mono">
                  {new Intl.NumberFormat(undefined, {
                    style: "currency",
                    currency: quote.currency,
                  }).format(quote.total_amount_minor / 100)}
                </strong>
              </p>
              <p>
                Available balance for a new payment:{" "}
                <strong className="mono">
                  {balanceKnown
                    ? new Intl.NumberFormat(undefined, {
                        style: "currency",
                        currency: quote.currency,
                      }).format(available! / 100)
                    : "Unavailable"}
                </strong>
              </p>

              <div style={{ display: "grid", gap: "1.5rem", marginTop: "1rem" }}>
                <div style={{ padding: "1rem", background: "rgba(255,255,255,0.03)", borderRadius: "8px" }}>
                  <h3>Option 1: Pay online with PayMongo</h3>
                  <p>Instant settlement via GCash, Maya, GrabPay, or Credit/Debit Card.</p>
                  <label htmlFor="payment-amount-online">
                    Your share ({quote.currency}, optional)
                    <input
                      id="payment-amount-online"
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Leave blank for the full available balance"
                    />
                  </label>
                  <button
                    type="button"
                    className="button button-volt"
                    style={{ minHeight: 48, marginTop: "0.5rem" }}
                    disabled={onlineBusy || busy || !balanceKnown || available === 0}
                    onClick={() => void startOnlinePaymongo()}
                  >
                    {onlineBusy ? "Starting PayMongo checkout…" : "Proceed to PayMongo Checkout"}
                  </button>
                  {onlineNotice && (
                    <p role="status" className="info-note" style={{ marginTop: "0.5rem" }}>
                      {onlineNotice}
                    </p>
                  )}
                </div>

                <div style={{ padding: "1rem", background: "rgba(255,255,255,0.03)", borderRadius: "8px" }}>
                  <h3>Option 2: Offline bank or cash reconciliation</h3>
                  <p>Submit an existing reference for chapter finance review.</p>
                  {payment ? (
                    <div role="status">
                      <h4>
                        {payment.status === "pending"
                          ? "Awaiting finance review"
                          : payment.status.replaceAll("_", " ")}
                      </h4>
                      <p>Reference received: {payment.provider_reference}</p>
                      <p>This is a reconciliation request. Your entry is marked paid only after approval.</p>
                    </div>
                  ) : (
                    <form onSubmit={submit}>
                      <label htmlFor="payment-reference">
                        Bank or cash receipt reference
                        <input
                          id="payment-reference"
                          required
                          maxLength={200}
                          value={reference}
                          onChange={(e) => setReference(e.target.value)}
                        />
                      </label>
                      <button
                        className="button button-outline"
                        style={{ minHeight: 48, marginTop: "0.5rem" }}
                        disabled={busy || onlineBusy || !balanceKnown || available === 0}
                      >
                        {busy ? "Submitting…" : "Send for finance review"}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </section>
          )
        )}
        {process.env.NEXT_PUBLIC_WSB_LOCAL_TESTING === "true" && session && eventId && (
          <LocalPaymongoCheckout
            key={scope}
            chapter={session.chapter_id}
            eventId={eventId}
            entryId={entryId}
            uid={session.uid}
            onChanged={() => {
              setQuote(null);
              setRefreshVersion((value) => value + 1);
            }}
          />
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
