"use client";

import { use } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status, Button, StatCard } from "@/components/ui";

export default function AdminEventReportsPage({
  params,
}: {
  params: Promise<{ chapterId: string; eventId: string }>;
}) {
  const { chapterId, eventId } = use(params);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeading
          eyebrow={`Chapter / ${chapterId.toUpperCase()} / Events`}
          title="Scrutineer Audit & Compliance Reports"
          description={`Comprehensive statistical analysis, score variance audits, and financial reconciliation for Event #${eventId}.`}
        />
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => alert("Generating Scrutineer Full Audit PDF...")}
            style={{ minHeight: "48px" }}
          >
            Export Scrutineer PDF
          </Button>
          <Button
            variant="secondary"
            onClick={() => alert("Exporting Raw Ledger CSV...")}
            style={{ minHeight: "48px" }}
          >
            Export Ledger CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Judge Variance" value="1.84%" meta="Low variance (Compliant)" tone="volt" />
        <StatCard label="Total Attendance" value="482 / 510" meta="94.5% check-in rate" />
        <StatCard label="Net Collections" value="₱ 285,000.00" meta="Reconciled ledger" tone="volt" />
        <StatCard label="Rule Infractions" value="1 Deducted" meta="-0.5 pt time violation" />
      </div>

      {/* THREE AUDIT REPORT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="panel p-6 bg-carbon border border-subtle rounded-xl space-y-4">
          <h3 className="text-xl font-bold text-chrome">Panel Score Variance</h3>
          <p className="text-sm text-titanium">
            Measures deviation between individual judge criteria and panel consensus.
          </p>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between p-2 bg-obsidian rounded">
              <span className="text-titanium">Judge Swift (J1)</span>
              <span className="mono text-volt">+0.42 pt variance</span>
            </div>
            <div className="flex justify-between p-2 bg-obsidian rounded">
              <span className="text-titanium">Judge Stretch (J2)</span>
              <span className="mono text-volt">-0.18 pt variance</span>
            </div>
            <div className="flex justify-between p-2 bg-obsidian rounded">
              <span className="text-titanium">Judge Yuki (J3)</span>
              <span className="mono text-volt">-0.24 pt variance</span>
            </div>
          </div>
          <Status tone="volt">AUDIT PASSED: NO BIAS DETECTED</Status>
        </div>

        <div className="panel p-6 bg-carbon border border-subtle rounded-xl space-y-4">
          <h3 className="text-xl font-bold text-chrome">Gate Attendance Reconciliation</h3>
          <p className="text-sm text-titanium">
            Validates wristband scan counts against registered crew rosters.
          </p>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between p-2 bg-obsidian rounded">
              <span className="text-titanium">Open Crew Division</span>
              <span className="mono text-chrome">216 / 216 present</span>
            </div>
            <div className="flex justify-between p-2 bg-obsidian rounded">
              <span className="text-titanium">Monster Crew Division</span>
              <span className="mono text-chrome">192 / 192 present</span>
            </div>
            <div className="flex justify-between p-2 bg-obsidian rounded">
              <span className="text-titanium">Spectator Wristbands</span>
              <span className="mono text-chrome">1,420 scanned</span>
            </div>
          </div>
          <Status tone="volt">ZERO UNREGISTERED DETECTED</Status>
        </div>

        <div className="panel p-6 bg-carbon border border-subtle rounded-xl space-y-4">
          <h3 className="text-xl font-bold text-chrome">Financial Reconciliation</h3>
          <p className="text-sm text-titanium">
            Authoritative breakdown of minor currency units recorded on Rust Axum store.
          </p>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between p-2 bg-obsidian rounded">
              <span className="text-titanium">Gross Registration</span>
              <span className="mono text-white">₱ 295,000.00</span>
            </div>
            <div className="flex justify-between p-2 bg-obsidian rounded">
              <span className="text-titanium">Merchant Processing</span>
              <span className="mono text-titanium">- ₱ 10,000.00</span>
            </div>
            <div className="flex justify-between p-2 bg-obsidian rounded">
              <span className="text-titanium">Net Settlement</span>
              <span className="mono text-volt font-bold">₱ 285,000.00</span>
            </div>
          </div>
          <Status tone="volt">MATCHES STRIPE/XENDIT PAYOUT</Status>
        </div>
      </div>
    </div>
  );
}
