"use client";

import { use } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status } from "@/components/ui";

export default function EventFeesPage({
  params,
}: {
  params: Promise<{ chapterId: string; eventId: string }>;
}) {
  const { chapterId, eventId } = use(params);

  const feeItems = [
    { division: "Open Crew", feeMinor: 120000, formatted: "₱1,200.00", basis: "Per registered dancer" },
    { division: "Monster Crew", feeMinor: 100000, formatted: "₱1,000.00", basis: "Per registered dancer" },
    { division: "Varsity Ignite (14&U)", feeMinor: 110000, formatted: "₱1,100.00", basis: "Per registered dancer" },
    { division: "Monster Varsity (18&U)", feeMinor: 110000, formatted: "₱1,100.00", basis: "Per registered dancer" },
    { division: "Junior (12&U)", feeMinor: 100000, formatted: "₱1,000.00", basis: "Per registered dancer" },
  ];

  return (
    <main id="main-content" className="workspace-main">
      <PageHeading
        eyebrow={`Event #${eventId} / Finance`}
        title="Division Fees & Minor Unit Ledger"
        description="Configure entry fee schedules in integer minor currency units. Rates are authoritatively applied during checkout."
        action={
          <Link href={`/admin/${chapterId}/events/${eventId}`} className="button button-outline">
            ← Command Center
          </Link>
        }
      />

      <section className="panel roster-panel">
        <div className="panel-heading">
          <div>
            <h2>Sanctioned Entry Fee Rates</h2>
            <p>Applied to dancer headcount during quote generation</p>
          </div>
          <span className="mono text-volt font-bold">PHP Currency</span>
        </div>

        <div className="roster-table">
          <div className="roster-header">
            <span>Division</span>
            <span>Fee (Display)</span>
            <span>Minor Units</span>
            <span>Calculation Basis</span>
            <span>Status</span>
          </div>
          {feeItems.map((f) => (
            <div className="roster-record" key={f.division}>
              <strong>{f.division}</strong>
              <span className="mono text-volt font-bold">{f.formatted}</span>
              <span className="mono text-titanium text-sm">{f.feeMinor}</span>
              <span className="text-sm text-titanium">{f.basis}</span>
              <Status tone="volt">Locked</Status>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}