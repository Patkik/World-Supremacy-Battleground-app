"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Arrow, Brand, PageHeading, Status, Button, StatCard } from "@/components/ui";

export default function DeviceSyncCenterPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState("");

  const [outbox, setOutbox] = useState([
    {
      id: "op-sync-8810",
      entity: "score-submission",
      target: "Entry #014 (Afterhours Collective)",
      revision: "rev_3",
      timestamp: "14:26:05",
      status: "Synced",
      tone: "volt" as const,
    },
    {
      id: "op-sync-8811",
      entity: "penalty-applied",
      target: "Entry #012 (-0.5 pts overtime)",
      revision: "rev_1",
      timestamp: "14:27:12",
      status: "Synced",
      tone: "volt" as const,
    },
    {
      id: "op-sync-8812",
      entity: "battle-vote",
      target: "Match 2 (Killa Kim - Red)",
      revision: "rev_1",
      timestamp: "14:29:44",
      status: "Pending Outbox",
      tone: "amber" as const,
    },
  ]);

  const handleTriggerSync = () => {
    setIsSyncing(true);
    setSyncStatusMsg("Flushing pending mutations to backend...");
    setTimeout(() => {
      setOutbox((prev) =>
        prev.map((item) => ({ ...item, status: "Synced", tone: "volt" }))
      );
      setIsSyncing(false);
      setSyncStatusMsg("All local mutations flushed. Authoritative state acknowledged.");
      setTimeout(() => setSyncStatusMsg(""), 4000);
    }, 800);
  };

  return (
    <div className="judge-shell">
      <header className="judge-header">
        <Brand />
        <div className="judge-event">
          <strong>Device & Offline Sync Center</strong>
          <span>Event Desk #{eventId} · Local Cache Engine</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/offline" className="text-link">
            Offline Diagnostic <Arrow diagonal />
          </Link>
          <Link href="/console" className="text-link">
            Console Hub <Arrow diagonal />
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <PageHeading
            eyebrow="Idempotency & Resilient Outbox"
            title="Local Outbox & Node Sync Ledger"
            description="Audit cached operations, review queued judge submissions, resolve version conflicts, and manually trigger sync to the authoritative Rust backend."
          />
          <Button
            variant="primary"
            onClick={handleTriggerSync}
            disabled={isSyncing}
            style={{ minHeight: "48px" }}
          >
            {isSyncing ? "Synchronizing Outbox..." : "Force Flush Outbox"}
          </Button>
        </div>

        {syncStatusMsg && (
          <div className="panel p-4 bg-volt/10 border border-volt text-chrome rounded">
            {syncStatusMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="Network Connection" value="Online" meta="Host ping: 12ms" tone="volt" />
          <StatCard label="Pending Outbox" value={outbox.filter(o => o.status !== "Synced").length.toString()} meta="Operations awaiting ack" tone={outbox.some(o => o.status !== "Synced") ? "amber" : "neutral"} />
          <StatCard label="Authoritative Rev" value="0x89F4" meta="Rust Axum node: OK" />
          <StatCard label="IndexedDB Storage" value="4.2 MB" meta="Offline assets cached" />
        </div>

        <section className="panel p-6 bg-carbon border border-subtle space-y-4">
          <h2 className="text-xl font-bold text-chrome">Local Mutation Queue (Outbox)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-subtle text-xs mono text-titanium">
                  <th className="p-4">Operation ID</th>
                  <th className="p-4">Entity Type</th>
                  <th className="p-4">Target Detail</th>
                  <th className="p-4">Rev</th>
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle">
                {outbox.map((op) => (
                  <tr key={op.id} className="hover:bg-subtle/30 transition-colors">
                    <td className="p-4 mono text-xs text-white">{op.id}</td>
                    <td className="p-4 mono text-xs text-volt">{op.entity}</td>
                    <td className="p-4 text-chrome font-medium">{op.target}</td>
                    <td className="p-4 mono text-xs text-titanium">{op.revision}</td>
                    <td className="p-4 mono text-xs text-titanium">{op.timestamp}</td>
                    <td className="p-4">
                      <Status tone={op.tone}>{op.status}</Status>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
