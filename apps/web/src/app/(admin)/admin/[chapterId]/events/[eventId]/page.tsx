"use client";

import { use } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status } from "@/components/ui";

export default function EventCommandCenterPage({
  params,
}: {
  params: Promise<{ chapterId: string; eventId: string }>;
}) {
  const { chapterId, eventId } = use(params);

  return (
    <main id="main-content" className="workspace-main">
      <PageHeading
        eyebrow={`Event Command / ${chapterId.toUpperCase()} / #${eventId}`}
        title="Manila Session 2027"
        description="Event operations command center: registration progress, division status, stage sequencing, and scoring locks."
        action={
          <div className="flex gap-2">
            <Link href={`/admin/${chapterId}/events/${eventId}/settings`} className="button button-outline">
              Settings
            </Link>
            <Link href={`/admin/${chapterId}/events/${eventId}/registrations`} className="button button-volt">
              Registration Queue (1) <Arrow />
            </Link>
          </div>
        }
      />

      {/* Primary KPI Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-carbon rounded border border-subtle">
          <span className="text-xs text-titanium block mb-1">Status</span>
          <Status tone="volt">LIVE REGISTRATION</Status>
          <span className="text-xs text-titanium block mt-2">Cutoff: 14 days</span>
        </div>

        <div className="p-4 bg-carbon rounded border border-subtle">
          <span className="text-xs text-titanium block mb-1">Total Entries</span>
          <strong className="text-2xl mono text-chrome">14</strong>
          <span className="text-xs text-volt block mt-1">13 Approved · 1 Pending</span>
        </div>

        <div className="p-4 bg-carbon rounded border border-subtle">
          <span className="text-xs text-titanium block mb-1">Dancers on Roster</span>
          <strong className="text-2xl mono text-chrome">118</strong>
          <span className="text-xs text-titanium block mt-1">100% ID Verified</span>
        </div>

        <div className="p-4 bg-carbon rounded border border-subtle">
          <span className="text-xs text-titanium block mb-1">Audio Files Checked</span>
          <strong className="text-2xl mono text-volt">14 / 14</strong>
          <span className="text-xs text-titanium block mt-1">Duration compliant</span>
        </div>
      </div>

      <div className="dashboard-columns">
        {/* Division Breakdown */}
        <section className="panel">
          <div className="panel-heading">
            <h2>Championship Divisions</h2>
            <Link href={`/admin/${chapterId}/events/${eventId}/divisions`} className="text-link text-xs">
              Configure Bounds <Arrow />
            </Link>
          </div>

          <div className="space-y-3">
            {[
              { name: "Open Crew", count: 6, max: 14, fee: "₱1,200/dancer", status: "Active" },
              { name: "Monster Crew", count: 3, max: 40, fee: "₱1,000/dancer", status: "Active" },
              { name: "Varsity Ignite (14&U)", count: 3, max: 18, fee: "₱1,100/dancer", status: "Active" },
              { name: "Monster Varsity (18&U)", count: 2, max: 30, fee: "₱1,100/dancer", status: "Active" },
            ].map((div) => (
              <div key={div.name} className="flex justify-between items-center p-3 rounded bg-tungsten border border-subtle">
                <div>
                  <strong className="text-sm text-chrome block">{div.name}</strong>
                  <span className="text-xs text-titanium mono">{div.fee}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm mono text-volt font-bold">{div.count} Crews</span>
                  <span className="text-xs text-muted block">Cap: 16 max</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Operational Shortcuts */}
        <aside className="panel space-y-4">
          <div className="panel-heading">
            <h2>Stage Day Controls</h2>
          </div>

          <div className="space-y-2">
            <Link
              href={`/admin/${chapterId}/events/${eventId}/registrations`}
              className="p-3 bg-tungsten rounded border border-subtle block hover:border-volt transition-colors"
            >
              <strong className="text-sm text-chrome block">Registrar Verification Queue</strong>
              <span className="text-xs text-titanium">Review dancer waivers and sign off entry snapshots.</span>
            </Link>

            <Link
              href={`/console/demo/judge`}
              className="p-3 bg-tungsten rounded border border-subtle block hover:border-volt transition-colors"
            >
              <strong className="text-sm text-chrome block">Judging Console</strong>
              <span className="text-xs text-titanium">Offline criteria scoring and division locking.</span>
            </Link>

            <Link
              href={`/arena-live/demo`}
              className="p-3 bg-tungsten rounded border border-subtle block hover:border-volt transition-colors"
            >
              <strong className="text-sm text-chrome block">Arena HUD & Stage Screen</strong>
              <span className="text-xs text-titanium">Published scores display for spectators and livestream.</span>
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}