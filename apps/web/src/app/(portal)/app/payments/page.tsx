"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status } from "@/components/ui";
import { fetchPayments, PaymentRecord } from "@/lib/api";

export default function MyPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchPayments("ph", "demo-token");
        setPayments(data);
      } catch {
        setPayments([
          {
            payment_id: "pay-1001",
            chapter_id: "ph",
            entry_id: "entry-manila-open-1",
            payer_uid: "dev-manager-1",
            amount_minor: 720000,
            currency: "PHP",
            status: "settled",
            provider_reference: "ref-pay-afterhours-1",
            created_at: 1700000000,
            settled_at: 1700000000,
          },
        ]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <main id="main-content" className="workspace-main">
      <PageHeading
        eyebrow="Financial Ledger"
        title="Payment History & Receipts"
        description="All division registration transactions, entry invoices, and official tax receipts."
        action={
          <Link href="/app" className="button button-outline">
            ← Overview
          </Link>
        }
      />

      <section className="panel roster-panel">
        <div className="panel-heading">
          <div>
            <h2>Reconciled Transactions</h2>
            <p>Minor currency unit settlement records</p>
          </div>
          <span className="mono text-volt font-bold">{payments.length} Payments</span>
        </div>

        <div className="roster-table">
          <div className="roster-header">
            <span>Payment ID</span>
            <span>Entry Reference</span>
            <span>Amount</span>
            <span>Gateway Ref</span>
            <span>Status & Receipt</span>
          </div>
          {payments.map((p) => (
            <div className="roster-record" key={p.payment_id}>
              <div>
                <strong>{p.payment_id}</strong>
                <span className="mono text-xs text-muted block">
                  {new Date(p.created_at * 1000).toLocaleDateString()}
                </span>
              </div>
              <span className="mono text-sm">{p.entry_id}</span>
              <span className="mono text-volt text-sm font-bold">
                ₱{(p.amount_minor / 100).toFixed(2)} {p.currency}
              </span>
              <span className="mono text-xs text-titanium">{p.provider_reference}</span>
              <div className="flex items-center gap-3">
                <Status tone={p.status === "settled" ? "volt" : "amber"}>
                  {p.status.toUpperCase()}
                </Status>
                <Link href={`/app/payments/${p.payment_id}`} className="button button-outline text-xs">
                  Receipt <Arrow />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}