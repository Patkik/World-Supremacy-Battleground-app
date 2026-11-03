"use client";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { selectedChapterFor, useWorkspaceSession } from "@/lib/account";
import { ApiError, connectedRequest, segment } from "@/lib/connected-api";
import type { PaymentQuote, PaymentRecord } from "@/lib/api";
import { firebaseClient } from "@/lib/firebase/client";
import { currencyMinorDigits, formatMinorCurrency, parseMajorCurrencyAmount } from "@/lib/money";
import { LocalPaymongoCheckout } from "./local-paymongo-checkout";
import { PageHeading } from "./ui";

export function ConnectedCheckout({ entryId, eventId }: { entryId: string; eventId: string | null }) {
  const { session, loading, error: sessionError } = useWorkspaceSession();
  const scope = session && eventId ? JSON.stringify([session.uid, session.chapter_id, eventId, entryId]) : "";
  const actionGeneration = useRef(0);
  const priorScope = useRef(scope);
  const renderedScope = useRef(scope);
  renderedScope.current = scope;
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

  function scopeIsCurrent(expectedScope: string, expectedUid: string, expectedChapter: string) {
    if (priorScope.current !== expectedScope || renderedScope.current !== expectedScope) return false;
    if (firebaseClient().auth.currentUser?.uid !== expectedUid) return false;
    const selected = selectedChapterFor(expectedUid);
    return !selected || selected === expectedChapter;
  }

  useLayoutEffect(() => {
    if (priorScope.current === scope) return;
    priorScope.current = scope;
    ++actionGeneration.current;
    setBusy(false); setOnlineBusy(false); setError(""); setOnlineNotice("");
    setAmount(""); setReference(""); setPayment(null);
  }, [scope]);

  function checkoutKind(urlValue: unknown, sessionId: unknown): "provider" | "local" {
    if (typeof sessionId !== "string" || !/^cs_[A-Za-z0-9_-]{1,125}$/.test(sessionId) || typeof urlValue !== "string") {
      throw new ApiError(502, "The checkout response was incomplete. The reservation remains pending; retry the same amount or contact finance.");
    }
    let url: URL;
    try { url = new URL(urlValue); }
    catch { throw new ApiError(502, "The checkout response did not contain a valid payment URL."); }
    if (url.origin !== "https://checkout.paymongo.com" || url.username || url.password) {
      throw new ApiError(502, "The checkout response did not contain an approved payment URL.");
    }
    if (url.pathname === "/local" && url.searchParams.get("session") === sessionId && !url.hash) return "local";
    if (/^\/cs_[A-Za-z0-9_-]{1,200}$/.test(url.pathname) && !!url.hash) return "provider";
    throw new ApiError(502, "The checkout URL did not match the saved session. The reservation remains pending; retry the same amount or contact finance.");
  }

  function checkoutError(reason: unknown) {
    if (reason instanceof ApiError && reason.status === 409) {
      return "This checkout is already reserved or needs reconciliation. Do not start another payment. Refresh your payment status, then contact chapter finance if the reservation remains unresolved.";
    }
    if (reason instanceof ApiError && (reason.status === 502 || reason.status === 503)) {
      return "The checkout result could not be confirmed. Your reservation may still be pending. Retry only with the same amount so the saved operation can be recovered; contact chapter finance if it remains unresolved.";
    }
    return reason instanceof Error ? reason.message : "PayMongo checkout unavailable.";
  }

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
    if (!quote) return undefined;
    return parseMajorCurrencyAmount(amount, quote.currency);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!session || !eventId || !balanceKnown || available === 0 || !scopeIsCurrent(scope, session.uid, session.chapter_id)) return;
    const generation = actionGeneration.current;
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
      if (generation !== actionGeneration.current || !scopeIsCurrent(scope, session.uid, session.chapter_id)) return;
      setPayment({ scope, value });
    } catch (reason) {
      if (generation === actionGeneration.current && scopeIsCurrent(scope, session.uid, session.chapter_id)) setError(reason instanceof Error ? reason.message : "Unable to submit payment reference.");
    } finally {
      if (generation === actionGeneration.current && scopeIsCurrent(scope, session.uid, session.chapter_id)) setBusy(false);
    }
  }

  async function startOnlinePaymongo() {
    if (!session || !eventId || !balanceKnown || available === 0 || !scopeIsCurrent(scope, session.uid, session.chapter_id)) return;
    const generation = actionGeneration.current;
    setOnlineBusy(true);
    setError("");
    setOnlineNotice("");
    try {
      const requestedAmount = parseRequestedAmount();
      const opKey = [
        "wsb.checkout.operation.v1",
        session.uid,
        session.chapter_id,
        eventId,
        entryId,
        requestedAmount ?? "remaining",
      ].join(":");
      let opId: string | null = null;
      try {
        opId = sessionStorage.getItem(opKey);
      } catch {
        // Continue with an in-memory operation ID when browser storage is disabled.
      }
      if (!opId) {
        opId = crypto.randomUUID();
        try {
          sessionStorage.setItem(opKey, opId);
        } catch {
          // A transient request failure can only be retried in this page session.
        }
      }
      const res = await connectedRequest<{
        checkout_url?: string;
        session_id?: string;
        reference_number?: string;
        amount_minor?: number;
        currency?: string;
      }>(
        `/v1/chapters/${segment(session.chapter_id)}/events/${segment(eventId)}/entries/${segment(entryId)}/paymongo/checkout`,
        { operation_id: opId, amount_minor: requestedAmount },
        "POST",
        session.uid
      );
      if (generation !== actionGeneration.current || !scopeIsCurrent(scope, session.uid, session.chapter_id)) return;
      const kind = checkoutKind(res.checkout_url, res.session_id);
      const expectedAmount = requestedAmount ?? available;
      if (!Number.isSafeInteger(expectedAmount) || res.amount_minor !== expectedAmount || res.currency !== quote?.currency || typeof res.reference_number !== "string" || !res.reference_number) {
        throw new ApiError(502, "The checkout response did not match the reserved amount and currency. The reservation remains pending; retry the same amount or contact finance.");
      }
      try {
        sessionStorage.removeItem(opKey);
      } catch {
        // The successful server response is authoritative even if cleanup fails.
      }
      if (kind === "provider") {
        window.location.href = res.checkout_url!;
      } else {
        setOnlineNotice("Test session initialized. Use the simulation panel below to settle or cancel.");
        setRefreshVersion((v) => v + 1);
      }
    } catch (reason) {
      if (generation === actionGeneration.current && scopeIsCurrent(scope, session.uid, session.chapter_id)) setError(checkoutError(reason));
    } finally {
      if (generation === actionGeneration.current && scopeIsCurrent(scope, session.uid, session.chapter_id)) setOnlineBusy(false);
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
                  {formatMinorCurrency(quote.total_amount_minor, quote.currency)}
                </strong>
              </p>
              <p>
                Available balance for a new payment:{" "}
                <strong className="mono">
                  {balanceKnown
                    ? formatMinorCurrency(available!, quote.currency)
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
                      inputMode={currencyMinorDigits(quote.currency) === 0 ? "numeric" : "decimal"}
                      aria-describedby="payment-amount-help"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Leave blank for the full available balance"
                    />
                  </label>
                  <p id="payment-amount-help" className="fineprint">
                    {currencyMinorDigits(quote.currency) === 0
                      ? "Enter a whole amount in this currency."
                      : `Enter up to ${currencyMinorDigits(quote.currency) ?? 2} decimal places, using a decimal point.`}
                  </p>
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
