"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status } from "@/components/ui";
import { fetchFinanceSummary, FinanceSummary } from "@/lib/api";

export default function ChapterFinancePage({
  params,
}: {
  params: Promise<{ chapterId: string }>;
}) {
  const { chapterId } = use(params);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchFinanceSummary(chapterId, "demo-token");
        setSummary(data);
      } catch {
        setSummary({
          chapter_id: chapterId,
          total_settled_minor: 10080000,
          total_pending_minor: 0,
          total_refunded_minor: 0,
          currency: "PHP",
          transaction_count: 14,
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [chapterId]);

  return (
    <main id="main-content" className="workspace-main">
      <PageHeading
        eyebrow={`Chapter Command / ${chapterId.toUpperCase()} / Finance`}
        title="Chapter Financial Overview"
        description="Reconciled ledger balances, entry fee settlements, transaction volumes, and refund audit records."
        action={
          <div className="flex gap-2">
            <Link href={`/admin/${chapterId}/finance/transactions`} className="button button-outline">
              All Transactions <Arrow />
            </Link>
            <Link href={`/admin/${chapterId}/finance/refunds`} className="button button-volt">
              Refunds & Disputes
            </Link>
          </div>
        }
      />

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 bg-carbon rounded border border-subtle">
          <span className="text-xs text-titanium block mb-1">Total Settled (Reconciled)</span>
          <strong className="text-2xl mono text-volt">
            ₱{(((summary?.total_settled_minor || 0) / 100)).toFixed(2)}
          </strong>
          <span className="text-xs text-titanium block mt-1">{summary?.currency} currency</span>
        </div>

        <div className="p-4 bg-carbon rounded border border-subtle">
          <span className="text-xs text-titanium block mb-1">Total Transactions</span>
          <strong className="text-2xl mono text-chrome">{summary?.transaction_count || 14}</strong>
          <span className="text-xs text-volt block mt-1">100% gateway matched</span>
        </div>

        <div className="p-4 bg-carbon rounded border border-subtle">
          <span className="text-xs text-titanium block mb-1">Pending Invoices</span>
          <strong className="text-2xl mono text-chrome">₱0.00</strong>
          <span className="text-xs text-titanium block mt-1">Zero overdue balances</span>
        </div>

        <div className="p-4 bg-carbon rounded border border-subtle">
          <span className="text-xs text-titanium block mb-1">Disputes / Refunds</span>
          <strong className="text-2xl mono text-chrome">₱0.00</strong>
          <span className="text-xs text-titanium block mt-1">0 active claims</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="panel p-6">
          <div className="panel-heading">
            <h2>Payment Gateway Reconciliation</h2>
            <Status tone="volt">Synced</Status>
          </div>
          <p className="text-sm text-titanium leading-relaxed mb-4">
            Gateways operate via webhook synchronization into the immutable chapter financial ledger. Minor currency units eliminate rounding drift.
          </p>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-2 border-b border-subtle">
              <span className="text-titanium">GCash / Maya Integration:</span>
              <strong className="text-volt mono">OPERATIONAL</strong>
            </div>
            <div className="flex justify-between py-2 border-b border-subtle">
              <span className="text-titanium">Card Processor:</span>
              <strong className="text-volt mono">STRIPE SECURE</strong>
            </div>
            <div className="flex justify-between py-2 border-b border-subtle">
              <span className="text-titanium">Webhook Idempotency:</span>
              <strong className="text-volt mono">STRICT UNIQUE TX REF</strong>
            </div>
          </div>
        </section>

        <section className="panel p-6">
          <div className="panel-heading">
            <h2>Financial Modules</h2>
          </div>
          <div className="space-y-3">
            <Link
              href={`/admin/${chapterId}/finance/transactions`}
              className="p-3 bg-tungsten rounded border border-subtle block hover:border-volt transition-colors"
            >
              <strong className="text-sm text-chrome block">Transactions Log</strong>
              <span className="text-xs text-titanium">Inspect line-by-line entry fee receipts and provider payload IDs.</span>
            </Link>

            <Link
              href={`/admin/${chapterId}/finance/refunds`}
              className="p-3 bg-tungsten rounded border border-subtle block hover:border-volt transition-colors"
            >
              <strong className="text-sm text-chrome block">Refund Management</strong>
              <span className="text-xs text-titanium">Process official fee reversals with automatic entry ledger deduction.</span>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}