"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status, Button, Select, Input, StatCard } from "@/components/ui";

export default function AdminAuditExplorerPage({
  params,
}: {
  params: Promise<{ chapterId: string }>;
}) {
  const { chapterId } = use(params);

  const [filterAction, setFilterAction] = useState("all");

  const auditEvents = [
    {
      id: "AUD-99120",
      timestamp: "2026-10-30 15:10:42 PHT",
      actor: "director.ph@wsb.com (Marcus V)",
      action: "RESULTS_PUBLISHED",
      target: "Event #event-manila-session-2027 / Division: Open Crew",
      details: "Official results published to Public and Arena HUD. Digest: 0x8F91...22A",
      tone: "volt" as const,
    },
    {
      id: "AUD-99119",
      timestamp: "2026-10-30 15:02:11 PHT",
      actor: "headjudge.swift@wsb.com (Ken S)",
      action: "DIVISION_LOCKED",
      target: "Division: Open Crew (18 entries scored)",
      details: "Head judge cryptographic lock engaged. Olympic trimmed mean computed.",
      tone: "volt" as const,
    },
    {
      id: "AUD-99118",
      timestamp: "2026-10-30 14:26:05 PHT",
      actor: "techjudge.wilkins@wsb.com (Lando W)",
      action: "PENALTY_ASSESSED",
      target: "Entry #012 (Legion X)",
      details: "Deduction of -0.5 pts applied for audio overtime exceeding 2m30s.",
      tone: "amber" as const,
    },
    {
      id: "AUD-99117",
      timestamp: "2026-10-30 12:44:30 PHT",
      actor: "finance.ph@wsb.com (Elena R)",
      action: "REFUND_EXECUTED",
      target: "Payment #pay-sample-002",
      details: "Approved withdrawal refund of ₱ 3,000.00 minor units to Afterhours Collective.",
      tone: "neutral" as const,
    },
    {
      id: "AUD-99116",
      timestamp: "2026-10-30 09:15:00 PHT",
      actor: "admin.ph@wsb.com (Root)",
      action: "ROLE_GRANTED",
      target: "User #usr-judge-03 (Yuki)",
      details: "Assigned Judge Panel role for Manila Session 2027.",
      tone: "neutral" as const,
    },
  ];

  const filtered = filterAction === "all"
    ? auditEvents
    : auditEvents.filter((e) => e.action === filterAction);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeading
          eyebrow={`Chapter / ${chapterId.toUpperCase()} / Compliance`}
          title="System Audit Log & Immutable Ledger"
          description="Every authoritative mutation—score submission, division lock, penalty, refund, or permission elevation—is cryptographically hashed and recorded."
        />
        <Button
          variant="secondary"
          onClick={() => alert("Exporting tamper-evident audit ledger JSON...")}
          style={{ minHeight: "48px" }}
        >
          Export Audit Ledger
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total Audit Events" value="1,842" meta="Chapter lifetime" />
        <StatCard label="Hash Chain" value="Verified" meta="Zero discrepancies" tone="volt" />
        <StatCard label="Last Action" value="RESULTS_PUBLISHED" meta="15:10 PHT" tone="volt" />
        <StatCard label="Operator Identity" value="MFA Enforced" meta="Signed webauthn keys" />
      </div>

      <div className="panel p-4 bg-carbon border border-subtle flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="text-xs text-titanium mono">FILTER BY ACTION:</label>
          <Select
            value={filterAction}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterAction(e.target.value)}
            style={{ minHeight: "40px" }}
          >
            <option value="all">All Actions</option>
            <option value="RESULTS_PUBLISHED">Results Published</option>
            <option value="DIVISION_LOCKED">Division Locked</option>
            <option value="PENALTY_ASSESSED">Penalty Assessed</option>
            <option value="REFUND_EXECUTED">Refund Executed</option>
            <option value="ROLE_GRANTED">Role Granted</option>
          </Select>
        </div>
        <span className="mono text-xs text-titanium">Showing {filtered.length} entries</span>
      </div>

      <div className="panel bg-carbon border border-subtle overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-subtle text-xs mono text-titanium">
              <th className="p-4">Event ID</th>
              <th className="p-4">Timestamp</th>
              <th className="p-4">Action</th>
              <th className="p-4">Actor</th>
              <th className="p-4">Target Entity</th>
              <th className="p-4">Audit Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-subtle">
            {filtered.map((ev) => (
              <tr key={ev.id} className="hover:bg-subtle/30 transition-colors">
                <td className="p-4 mono text-xs text-white">{ev.id}</td>
                <td className="p-4 mono text-xs text-titanium">{ev.timestamp}</td>
                <td className="p-4">
                  <Status tone={ev.tone}>{ev.action}</Status>
                </td>
                <td className="p-4 mono text-xs text-chrome">{ev.actor}</td>
                <td className="p-4 text-xs text-titanium font-medium">{ev.target}</td>
                <td className="p-4 text-xs text-titanium max-w-xs">{ev.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
