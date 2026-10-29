"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status, Button, Select, StatCard } from "@/components/ui";

export default function AdminSupportWorkQueuePage({
  params,
}: {
  params: Promise<{ chapterId: string }>;
}) {
  const { chapterId } = use(params);

  const [tickets, setTickets] = useState([
    {
      id: "TKT-8841",
      requester: "Marcus Vance (Afterhours)",
      subject: "Music file re-upload request after mastering adjustment",
      category: "Music Compliance",
      priority: "High",
      status: "In Progress",
      assigned: "Elena Rivera",
      tone: "amber" as const,
    },
    {
      id: "TKT-8840",
      requester: "Chloe Santos (Alliance Project)",
      subject: "Parent guardian minor consent signature error on iOS Safari",
      category: "Legal & Consents",
      priority: "Normal",
      status: "Resolved",
      assigned: "Support Lead",
      tone: "volt" as const,
    },
    {
      id: "TKT-8839",
      requester: "Leo David (Legion X)",
      subject: "Official Tax Withholding Invoice Receipt for PHP registration",
      category: "Billing & Finance",
      priority: "Normal",
      status: "Open",
      assigned: "Finance Desk",
      tone: "neutral" as const,
    },
  ]);

  const handleResolve = (id: string) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: "Resolved", tone: "volt" as const } : t))
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeading
          eyebrow={`Chapter / ${chapterId.toUpperCase()} / Operations`}
          title="Support Inquiries & Exception Queue"
          description={`Triage inbound requests from directors, choreographers, and guardians regarding registrations, audio compliance, and ticketing.`}
        />
        <Button
          variant="secondary"
          onClick={() => alert("All unresolved tickets escalated to event duty manager.")}
          style={{ minHeight: "48px" }}
        >
          Escalate Pending
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Open Tickets" value={tickets.filter(t => t.status !== "Resolved").length.toString()} meta="Awaiting action" tone="amber" />
        <StatCard label="Resolved Today" value="14 Tickets" meta="Average SLA: 22 mins" tone="volt" />
        <StatCard label="Urgent Priority" value="1 Ticket" meta="Audio replacement" tone="amber" />
        <StatCard label="Satisfaction" value="98.5%" meta="Director feedback" tone="volt" />
      </div>

      <div className="panel bg-carbon border border-subtle overflow-x-auto rounded-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-subtle text-xs mono text-titanium">
              <th className="p-4">Ticket ID</th>
              <th className="p-4">Requester</th>
              <th className="p-4">Subject</th>
              <th className="p-4">Category</th>
              <th className="p-4">Priority</th>
              <th className="p-4">Assigned</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-subtle">
            {tickets.map((t) => (
              <tr key={t.id} className="hover:bg-subtle/30 transition-colors">
                <td className="p-4 mono text-xs text-white">{t.id}</td>
                <td className="p-4 font-bold text-chrome text-sm">{t.requester}</td>
                <td className="p-4 text-xs text-titanium max-w-sm">{t.subject}</td>
                <td className="p-4 mono text-xs text-titanium">{t.category}</td>
                <td className="p-4 mono text-xs">
                  <span className={t.priority === "High" ? "text-amber font-bold" : "text-titanium"}>
                    {t.priority}
                  </span>
                </td>
                <td className="p-4 text-xs text-titanium">{t.assigned}</td>
                <td className="p-4">
                  <Status tone={t.tone}>{t.status}</Status>
                </td>
                <td className="p-4 text-right">
                  {t.status !== "Resolved" ? (
                    <button
                      onClick={() => handleResolve(t.id)}
                      className="button button-ghost text-xs"
                    >
                      Mark Resolved
                    </button>
                  ) : (
                    <span className="mono text-xs text-volt">Closed</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
