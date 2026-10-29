"use client";

import { use } from "react";
import Link from "next/link";
import { Arrow, Brand, PageHeading, Status, Button, StatCard } from "@/components/ui";

export default function EventDayDirectorHubPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeading
          eyebrow="Event Day Live Monitor"
          title="Manila Session 2027 · Director Command"
          description="Real-time backstage schedule, stage marshal calls, and estimated performance times for Afterhours Collective."
        />
        <div className="flex gap-2">
          <Link
            href={`/events/${eventId}/live`}
            target="_blank"
            className="button button-secondary"
            style={{ minHeight: "48px" }}
          >
            Spectator Stream <Arrow diagonal />
          </Link>
          <Link
            href="/app/passes"
            className="button button-volt"
            style={{ minHeight: "48px" }}
          >
            Digital Passes <Arrow />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Your Entry" value="#014" meta="Open Crew Division" tone="volt" />
        <StatCard label="Queue Position" value="3 Routines Away" meta="Current on stage: #011" tone="amber" />
        <StatCard label="Estimated Call" value="14:45 PHT" meta="On time (+0m)" />
        <StatCard label="Roster Status" value="12 / 12 In Venue" meta="All passes scanned" />
      </div>

      {/* CALL TO WINGS BANNER */}
      <div className="panel p-6 bg-amber/10 border-2 border-amber text-chrome rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="badge badge-amber text-xs mono">STAGE MARSHAL INSTRUCTION</span>
          <h3 className="text-xl font-bold text-white mt-1">
            Report to Stage Left Wings at 14:35 PHT
          </h3>
          <p className="text-sm text-titanium">
            Have your dancers in full uniform with passes ready for final headcount check.
          </p>
        </div>
        <Button variant="primary" style={{ minHeight: "48px" }}>
          Acknowledge Call
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="panel p-6 bg-carbon border border-subtle space-y-4">
          <h2 className="text-xl font-bold text-chrome">Live Backstage Timetable</h2>
          <div className="space-y-3">
            {[
              { time: "13:30 PHT", task: "Warm-up Studio B Assigned (Floor rehearsal)", status: "Completed", tone: "neutral" as const },
              { time: "14:15 PHT", task: "DJ Soundcheck Cue & Audio Check", status: "Verified", tone: "volt" as const },
              { time: "14:35 PHT", task: "Stage Left Marshal Call (Lineup in wings)", status: "Upcoming", tone: "amber" as const },
              { time: "14:45 PHT", task: "Performance Routine on Arena Floor", status: "Scheduled", tone: "neutral" as const },
            ].map((slot, i) => (
              <div key={i} className="p-4 bg-obsidian border border-subtle rounded flex justify-between items-center">
                <div>
                  <span className="mono text-xs text-titanium block">{slot.time}</span>
                  <strong className="text-chrome text-sm">{slot.task}</strong>
                </div>
                <Status tone={slot.tone}>{slot.status}</Status>
              </div>
            ))}
          </div>
        </section>

        <section className="panel p-6 bg-carbon border border-subtle space-y-4">
          <h2 className="text-xl font-bold text-chrome">Compliance & Readiness Checklist</h2>
          <div className="space-y-3">
            {[
              { item: "Official Routine Track (.mp3 / 2:28)", detail: "Clean edit certified by audio lead", done: true },
              { item: "Prop Safety Approval", detail: "No props or floor residue declared", done: true },
              { item: "Minor Legal Consents", detail: "2 minor dancers verified with guardian signatures", done: true },
              { item: "Full Roster Accreditation", detail: "12 wristbands issued at Door 3", done: true },
            ].map((check, i) => (
              <div key={i} className="p-4 bg-obsidian border border-subtle rounded flex items-center gap-3">
                <span className="text-volt font-bold mono">[DONE]</span>
                <div>
                  <h4 className="text-sm font-bold text-chrome">{check.item}</h4>
                  <p className="text-xs text-titanium">{check.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
