"use client";

import { use } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status } from "@/components/ui";

export default function EventDivisionsPage({
  params,
}: {
  params: Promise<{ chapterId: string; eventId: string }>;
}) {
  const { chapterId, eventId } = use(params);

  const divisions = [
    {
      id: "open-crew",
      name: "Open Crew",
      minMembers: 5,
      maxMembers: 14,
      maxDurationSecs: 180,
      maxAge: "All Ages",
      feePerDancer: "₱1,200.00",
      status: "Active",
    },
    {
      id: "monster-crew",
      name: "Monster Crew",
      minMembers: 20,
      maxMembers: 40,
      maxDurationSecs: 240,
      maxAge: "All Ages",
      feePerDancer: "₱1,000.00",
      status: "Active",
    },
    {
      id: "varsity-ignite",
      name: "Varsity Ignite (14&U)",
      minMembers: 5,
      maxMembers: 18,
      maxDurationSecs: 150,
      maxAge: "14 & Under",
      feePerDancer: "₱1,100.00",
      status: "Active",
    },
    {
      id: "monster-varsity",
      name: "Monster Varsity (18&U)",
      minMembers: 10,
      maxMembers: 30,
      maxDurationSecs: 180,
      maxAge: "18 & Under",
      feePerDancer: "₱1,100.00",
      status: "Active",
    },
    {
      id: "junior",
      name: "Junior (12&U)",
      minMembers: 5,
      maxMembers: 14,
      maxDurationSecs: 150,
      maxAge: "12 & Under",
      feePerDancer: "₱1,000.00",
      status: "Active",
    },
  ];

  return (
    <main id="main-content" className="workspace-main">
      <PageHeading
        eyebrow={`Event #${eventId} / Governance`}
        title="Divisions & Rules Configuration"
        description="Official division capacity constraints, age limits, performance track duration caps, and minor unit entry fees."
        action={
          <Link href={`/admin/${chapterId}/events/${eventId}`} className="button button-outline">
            ← Command Center
          </Link>
        }
      />

      <section className="panel roster-panel">
        <div className="panel-heading">
          <div>
            <h2>Configured Competition Divisions</h2>
            <p>Enforced by authoritative Rust API upon entry creation and submission</p>
          </div>
          <span className="mono text-volt font-bold">5 Divisions</span>
        </div>

        <div className="roster-table">
          <div className="roster-header">
            <span>Division Name</span>
            <span>Roster Bounds</span>
            <span>Duration Cap</span>
            <span>Age Limit</span>
            <span>Fee / Dancer</span>
            <span>Status</span>
          </div>
          {divisions.map((d) => (
            <div className="roster-record" key={d.id}>
              <div>
                <strong>{d.name}</strong>
                <span className="mono text-xs text-muted block">{d.id}</span>
              </div>
              <span className="mono text-sm">{d.minMembers}–{d.maxMembers} dancers</span>
              <span className="mono text-sm">{d.maxDurationSecs}s ({Math.floor(d.maxDurationSecs / 60)}m{d.maxDurationSecs % 60 ? ` ${d.maxDurationSecs % 60}s` : ""})</span>
              <span className="text-titanium text-sm">{d.maxAge}</span>
              <span className="mono text-volt text-sm">{d.feePerDancer}</span>
              <Status tone="volt">{d.status}</Status>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6 p-4 rounded bg-carbon border border-subtle">
        <h3 className="font-bold text-chrome text-sm mb-1">Authoritative Boundary Enforcement</h3>
        <p className="text-xs text-titanium leading-relaxed">
          The Rust backend computes multi-factor entry readiness at <code>/v1/chapters/&#123;chapter&#125;/events/&#123;event&#125;/entries/&#123;id&#125;</code>.
          Any submission falling below minimum member bounds or exceeding duration caps is authoritatively rejected and transitioned to <code>needs_correction</code>.
        </p>
      </div>
    </main>
  );
}