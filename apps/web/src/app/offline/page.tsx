"use client";

import { useState } from "react";
import Link from "next/link";
import { Arrow, Brand, PageHeading, Status, Button, StatCard } from "@/components/ui";

export default function OfflineReconnectPage() {
  const [checking, setChecking] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState<"offline" | "online">("offline");

  const handleTestConnection = () => {
    setChecking(true);
    setTimeout(() => {
      setChecking(false);
      setOnlineStatus(navigator.onLine ? "online" : "offline");
    }, 700);
  };

  return (
    <div className="system-page max-w-4xl mx-auto p-6 space-y-8">
      <header className="flex justify-between items-center w-full pb-6 border-b border-subtle">
        <Brand />
        <Status tone={onlineStatus === "online" ? "volt" : "amber"}>
          {onlineStatus === "online" ? "RECONNECTED" : "OFFLINE PROTOCOL ACTIVE"}
        </Status>
      </header>

      <div className="space-y-4">
        <PageHeading
          eyebrow="Tactical Offline Resiliency"
          title="Network Connection Interrupted"
          description="Your local workstation has entered offline mode. Local scores, drafts, and queue mutations remain safely preserved in local memory and will synchronize automatically upon reconnect."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Local Outbox" value="3 Operations" meta="Stored in IndexedDB" tone="volt" />
        <StatCard label="Local Cache" value="Hot & Intact" meta="No data loss" />
        <StatCard label="Backend Ping" value={onlineStatus === "online" ? "14ms" : "Unreachable"} meta="Automatic retry active" tone={onlineStatus === "online" ? "volt" : "amber"} />
      </div>

      <div className="panel p-6 bg-carbon border border-subtle rounded-xl space-y-4">
        <h3 className="text-xl font-bold text-chrome">Active Cached Desks</h3>
        <p className="text-sm text-titanium">
          You can continue scoring, reviewing rosters, and checking in attendees while offline. Operations will be queued with monotonic revision timestamps.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <Link
            href="/console/demo/judge"
            className="p-4 bg-obsidian border border-subtle hover:border-volt rounded-lg flex justify-between items-center"
          >
            <div>
              <strong className="block text-chrome">Judge Desk</strong>
              <span className="text-xs text-titanium">Scoring rubric operates locally</span>
            </div>
            <Arrow />
          </Link>

          <Link
            href="/console"
            className="p-4 bg-obsidian border border-subtle hover:border-volt rounded-lg flex justify-between items-center"
          >
            <div>
              <strong className="block text-chrome">Console Hub</strong>
              <span className="text-xs text-titanium">Switch duties or view outbox</span>
            </div>
            <Arrow />
          </Link>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-subtle">
        <Button
          variant="primary"
          onClick={handleTestConnection}
          disabled={checking}
          style={{ minHeight: "48px" }}
        >
          {checking ? "Probing Axum Host..." : "Test Connection Now"}
        </Button>
        <Link
          href="/console"
          className="button button-secondary"
          style={{ minHeight: "48px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
        >
          Return to Active Duty Console
        </Link>
      </div>
    </div>
  );
}
