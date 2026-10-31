"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useWorkspaceSession } from "@/lib/account";
import { connectedRequest, segment } from "@/lib/connected-api";
import type { PaymentQuote } from "@/lib/api";
import { PageHeading } from "@/components/ui";

function PaymentReturnContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id") || "";
  const entryId = searchParams.get("entry") || searchParams.get("entry_id") || "";
  const eventId = searchParams.get("event") || searchParams.get("event_id") || "";
  const chapter = searchParams.get("chapter") || "";

  const { session, loading: sessionLoading } = useWorkspaceSession();
  const [quote, setQuote] = useState<PaymentQuote | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  const chapterId = chapter || session?.chapter_id || "";

  async function checkStatus() {
    if (!session || !chapterId || !eventId || !entryId) return;
    setChecking(true);
    setError("");
    try {
      const q = await connectedRequest<PaymentQuote>(
        `/v1/chapters/${segment(chapterId)}/events/${segment(eventId)}/entries/${segment(entryId)}/quote`,
        undefined,
        "GET",
        session.uid
      );
      setQuote(q);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to retrieve entry payment status.");
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    if (session && chapterId && eventId && entryId) {
      void checkStatus();
    }
  }, [session, chapterId, eventId, entryId]);

  return (
    <div className="connected-stack">
      {sessionId && (
        <section className="panel" aria-labelledby="session-summary-heading">
          <h2 id="session-summary-heading">Checkout reference</h2>
          <p>
            PayMongo Session Reference: <strong className="mono">{sessionId}</strong>
          </p>
          <p className="info-note">
            Returning from PayMongo does not confirm settlement. The WSB backend authoritatively
            reconciles payments upon receiving a signed webhook callback.
          </p>
        </section>
      )}

      {sessionLoading ? (
        <p role="status">Checking account session…</p>
      ) : !session ? (
        <section className="panel">
          <p>Sign in to verify your payment status.</p>
          <Link className="button button-volt" href="/sign-in">
            Sign in
          </Link>
        </section>
      ) : entryId && eventId ? (
        <section className="panel" aria-labelledby="entry-status-heading">
          <h2 id="entry-status-heading">Entry payment reconciliation</h2>
          {checking && <p role="status">Checking server ledger…</p>}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {quote && (() => {
            const paidMinor = quote.paid_amount_minor ?? 0;
            const pendingMinor = quote.pending_amount_minor ?? 0;
            const availableMinor = quote.available_amount_minor ?? 0;
            return (
              <div className="connected-stack">
                <p>
                  Division: <strong>{quote.division_name}</strong>
                </p>
                <p>
                  Total entry fee:{" "}
                  <strong className="mono">
                    {new Intl.NumberFormat(undefined, {
                      style: "currency",
                      currency: quote.currency,
                    }).format(quote.total_amount_minor / 100)}
                  </strong>
                </p>
                <p>
                  Settled amount:{" "}
                  <strong className="mono">
                    {new Intl.NumberFormat(undefined, {
                      style: "currency",
                      currency: quote.currency,
                    }).format(paidMinor / 100)}
                  </strong>
                </p>
                <p>
                  Pending reconciliation:{" "}
                  <strong className="mono">
                    {new Intl.NumberFormat(undefined, {
                      style: "currency",
                      currency: quote.currency,
                    }).format(pendingMinor / 100)}
                  </strong>
                </p>
                {paidMinor >= quote.total_amount_minor ? (
                  <div role="status" className="notice-success">
                    <p>
                      <strong>Payment fully settled!</strong> Your entry has been credited and
                      reconciled.
                    </p>
                  </div>
                ) : pendingMinor > 0 ? (
                  <div role="status" className="notice-pending">
                    <p>
                      <strong>Payment awaiting webhook delivery.</strong> Your payment was submitted
                      and will be confirmed once the signed PayMongo webhook is received by our server.
                    </p>
                  </div>
                ) : (
                  <div role="status">
                    <p>
                      Outstanding balance:{" "}
                      <strong className="mono">
                        {new Intl.NumberFormat(undefined, {
                          style: "currency",
                          currency: quote.currency,
                        }).format(availableMinor / 100)}
                      </strong>
                    </p>
                  </div>
                )}
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "1rem" }}>
                  <button
                    type="button"
                    className="button button-outline"
                    style={{ minHeight: 48 }}
                    disabled={checking}
                    onClick={() => void checkStatus()}
                  >
                    {checking ? "Checking…" : "Refresh status"}
                  </button>
                  <Link
                    className="button button-outline"
                    style={{ minHeight: 48 }}
                    href={`/app/entries/${segment(entryId)}/checkout?event=${segment(eventId)}`}
                  >
                    Return to checkout
                  </Link>
                </div>
              </div>
            );
          })()}
        </section>
      ) : null}

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <Link className="button button-volt" style={{ minHeight: 48 }} href="/app/payments">
          Open payment records
        </Link>
        <Link className="button button-outline" style={{ minHeight: 48 }} href="/app/entries">
          View all entries
        </Link>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <main id="main-content" className="workspace-main">
      <PageHeading
        title="Check your payment status"
        description="Returning from a payment page does not confirm a settlement. Open your payment records to view the server’s current status."
      />
      <Suspense fallback={<p role="status">Loading payment verification…</p>}>
        <PaymentReturnContent />
      </Suspense>
    </main>
  );
}
