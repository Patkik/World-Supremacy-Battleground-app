"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Arrow, PageHeading, Status } from "@/components/ui";
import { fetchPaymentQuote, submitPayment, PaymentQuote } from "@/lib/api";

export default function EntryCheckoutPage({
  params,
}: {
  params: Promise<{ entryId: string }>;
}) {
  const { entryId } = use(params);
  const router = useRouter();
  const [quote, setQuote] = useState<PaymentQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const q = await fetchPaymentQuote("ph", "demo-token", "manila-session-2027", entryId);
        setQuote(q);
      } catch {
        setQuote({
          entry_id: entryId,
          division_name: "Open Crew",
          dancer_count: 6,
          rate_per_dancer_minor: 120000,
          total_amount_minor: 720000,
          currency: "PHP",
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [entryId]);

  async function handlePay() {
    setProcessing(true);
    setErrorMsg(null);
    try {
      const mockRef = `provider-tx-${Date.now()}`;
      await submitPayment("ph", "demo-token", "manila-session-2027", entryId, mockRef);
      router.push(`/app/payment-return?status=success&entry_id=${entryId}`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Payment processing error.");
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <main className="workspace-main">
        <PageHeading eyebrow="Secure Invoicing" title="Generating invoice..." description="Calculating dancer headcount fees." />
      </main>
    );
  }

  return (
    <main id="main-content" className="workspace-main">
      <PageHeading
        eyebrow={`Entry #${entryId} / Checkout`}
        title="Registration Fee Checkout"
        description="Review your division entry quote and complete registration payment."
        action={
          <Link href={`/app/entries/${entryId}`} className="button button-outline">
            ← Cancel
          </Link>
        }
      />

      {errorMsg && <p className="info-note" role="status" style={{ borderLeftColor: "var(--accent-crimson)" }}>{errorMsg}</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <section className="panel col-span-2">
          <div className="panel-heading">
            <h2>Championship Entry Invoice</h2>
            <Status tone="volt">Official Invoice</Status>
          </div>

          <div className="space-y-4 text-sm pt-2">
            <div className="flex justify-between py-2 border-b border-subtle">
              <span className="text-titanium">Championship Event:</span>
              <strong className="text-chrome">Manila Session 2027</strong>
            </div>
            <div className="flex justify-between py-2 border-b border-subtle">
              <span className="text-titanium">Division:</span>
              <strong className="text-chrome">{quote?.division_name}</strong>
            </div>
            <div className="flex justify-between py-2 border-b border-subtle">
              <span className="text-titanium">Dancer Headcount:</span>
              <strong className="mono text-chrome">{quote?.dancer_count} Registered Dancers</strong>
            </div>
            <div className="flex justify-between py-2 border-b border-subtle">
              <span className="text-titanium">Rate per Dancer:</span>
              <strong className="mono text-titanium">
                ₱{(((quote?.rate_per_dancer_minor || 0) / 100)).toFixed(2)} {quote?.currency}
              </strong>
            </div>

            <div className="p-4 bg-tungsten rounded border border-subtle flex justify-between items-center mt-4">
              <div>
                <span className="text-xs text-titanium block mb-1">Total Amount Due:</span>
                <strong className="text-2xl mono text-volt font-bold">
                  ₱{(((quote?.total_amount_minor || 0) / 100)).toFixed(2)} {quote?.currency}
                </strong>
              </div>
              <span className="text-xs mono text-titanium">Minor units: {quote?.total_amount_minor}</span>
            </div>

            <div className="pt-4">
              <button
                onClick={handlePay}
                disabled={processing}
                className="button button-volt text-base w-full py-4 text-center justify-center font-bold"
              >
                {processing ? "Authorizing Payment Ledger..." : "Pay Now & Confirm Registration"} <Arrow diagonal />
              </button>
            </div>
          </div>
        </section>

        <aside className="panel space-y-4">
          <div className="panel-heading">
            <h2>Payment Safeguards</h2>
          </div>
          <p className="text-xs text-titanium leading-relaxed">
            All registration transactions are recorded idempotently in minor currency units. Receipts are generated immediately upon gateway settlement.
          </p>
          <div className="p-3 bg-tungsten rounded border border-subtle text-xs text-titanium">
            <strong className="text-chrome block mb-1">Accepted Payment Gateways:</strong>
            GCash, Maya, Visa, Mastercard, and Bank Transfer.
          </div>
        </aside>
      </div>
    </main>
  );
}