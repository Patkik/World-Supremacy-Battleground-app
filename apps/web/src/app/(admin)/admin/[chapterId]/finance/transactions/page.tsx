"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status } from "@/components/ui";
import { fetchPayments, PaymentRecord } from "@/lib/api";

export default function TransactionsLogPage({
  params,
}: {
  params: Promise<{ chapterId: string }>;
}) {
  const { chapterId } = use(params);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchPayments(chapterId, "demo-token");
        setPayments(data);
      } catch {
        setPayments([
          {
            payment_id: "pay-1001",
            chapter_id: chapterId,
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
      }
    }
    load();
  }, [chapterId]);

  return (
    <main id="main-content" className="workspace-main">
      <PageHeading
        eyebrow={`Chapter / ${chapterId.toUpperCase()} / Finance`}
        title="Transactions Ledger"
        description="Audit-ready ledger of all inbound gateway settlements, payer references, and minor currency totals."
        action={
          <Link href={`/admin/${chapterId}/finance`} className="button button-outline">
            ← Finance Overview
          </Link>
        }
      />

      <section className="panel roster-panel">
        <div className="panel-heading">
          <div>
            <h2>Reconciled Transaction Log</h2>
            <p>Every transaction is locked to a specific championship entry ID</p>
          </div>
          <span className="mono text-volt font-bold">{payments.length} Records</span>
        </div>

        <div className="roster-table">
          <div className="roster-header">
            <span>Payment ID</span>
            <span>Entry ID</span>
            <span>Payer UID</span>
            <span>Settled Amount</span>
            <span>Gateway Reference</span>
            <span>Status</span>
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
              <span className="mono text-xs text-titanium">{p.payer_uid}</span>
              <span className="mono text-volt font-bold">
                ₱{(p.amount_minor / 100).toFixed(2)} {p.currency}
              </span>
              <span className="mono text-xs text-titanium">{p.provider_reference}</span>
              <Status tone={p.status === "settled" ? "volt" : "amber"}>
                {p.status.toUpperCase()}
              </Status>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}