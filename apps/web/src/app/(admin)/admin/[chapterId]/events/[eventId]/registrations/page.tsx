"use client";

import { useState, use } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status } from "@/components/ui";

interface EntrySummary {
  id: string;
  crewName: string;
  division: string;
  rosterCount: number;
  durationSecs: number;
  minorConsentsOk: boolean;
  paymentSettled: boolean;
  status: "submitted" | "approved" | "needs_correction" | "draft";
}

export default function RegistrationReviewQueuePage({
  params,
}: {
  params: Promise<{ chapterId: string; eventId: string }>;
}) {
  const { chapterId, eventId } = use(params);
  const [filter, setFilter] = useState<string>("all");

  const entries: EntrySummary[] = [
    {
      id: "entry-manila-open-1",
      crewName: "Afterhours Collective",
      division: "Open Crew",
      rosterCount: 6,
      durationSecs: 172,
      minorConsentsOk: true,
      paymentSettled: true,
      status: "submitted",
    },
    {
      id: "entry-manila-monster-1",
      crewName: "FMD Xtreme",
      division: "Monster Crew",
      rosterCount: 28,
      durationSecs: 235,
      minorConsentsOk: true,
      paymentSettled: true,
      status: "approved",
    },
    {
      id: "entry-manila-varsity-1",
      crewName: "Junior Empire PH",
      division: "Varsity Ignite",
      rosterCount: 12,
      durationSecs: 148,
      minorConsentsOk: false,
      paymentSettled: true,
      status: "needs_correction",
    },
    {
      id: "entry-manila-open-2",
      crewName: "Alliance Project",
      division: "Open Crew",
      rosterCount: 10,
      durationSecs: 178,
      minorConsentsOk: true,
      paymentSettled: true,
      status: "approved",
    },
  ];

  const filteredEntries = filter === "all" ? entries : entries.filter((e) => e.status === filter);

  return (
    <main id="main-content" className="workspace-main">
      <PageHeading
        eyebrow={`Event #${eventId} / Registrar`}
        title="Registration Review Queue"
        description="Inspect submitted crew entries, verify audio duration, validate guardian waivers, and issue stage credentials."
        action={
          <Link href={`/admin/${chapterId}/events/${eventId}`} className="button button-outline">
            ← Command Center
          </Link>
        }
      />

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { key: "all", label: `All (${entries.length})` },
          { key: "submitted", label: `Awaiting Review (${entries.filter((e) => e.status === "submitted").length})` },
          { key: "needs_correction", label: `Needs Correction (${entries.filter((e) => e.status === "needs_correction").length})` },
          { key: "approved", label: `Approved (${entries.filter((e) => e.status === "approved").length})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded text-xs font-semibold transition-colors ${
              filter === key ? "bg-volt text-black" : "bg-tungsten text-titanium hover:text-chrome"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Review Queue Table */}
      <section className="panel roster-panel">
        <div className="panel-heading">
          <div>
            <h2>Submitted Event Entries</h2>
            <p>Showing {filteredEntries.length} entries matching filter criteria</p>
          </div>
        </div>

        <div className="roster-table">
          <div className="roster-header">
            <span>Crew & Entry ID</span>
            <span>Division</span>
            <span>Roster</span>
            <span>Audio & Consent</span>
            <span>Payment</span>
            <span>Status & Action</span>
          </div>
          {filteredEntries.map((e) => (
            <div className="roster-record" key={e.id}>
              <div>
                <strong>{e.crewName}</strong>
                <span className="mono text-xs text-muted block">{e.id}</span>
              </div>
              <span className="text-sm text-chrome">{e.division}</span>
              <span className="mono text-sm">{e.rosterCount} dancers</span>
              <div>
                <span className="mono text-xs block text-titanium">{e.durationSecs}s audio</span>
                <span className={`text-xs ${e.minorConsentsOk ? "text-volt" : "text-amber-400"}`}>
                  {e.minorConsentsOk ? "Waivers Verified" : "Waiver Missing"}
                </span>
              </div>
              <span className="mono text-volt text-xs">Reconciled</span>
              <div className="flex items-center gap-3">
                <Status tone={e.status === "approved" || e.status === "submitted" ? "volt" : "amber"}>
                  {e.status.replace("_", " ")}
                </Status>
                <Link
                  href={`/admin/${chapterId}/events/${eventId}/registrations/${e.id}`}
                  className="button button-outline text-xs"
                >
                  Inspect <Arrow />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}