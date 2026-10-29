"use client";

import { use } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status } from "@/components/ui";

export default function ChapterDashboardPage({
  params,
}: {
  params: Promise<{ chapterId: string }>;
}) {
  const { chapterId } = use(params);
  const chapterName = chapterId === "hk" ? "WSB Hong Kong" : chapterId === "au" ? "WSB Australia" : "WSB Philippines";

  return (
    <main id="main-content" className="workspace-main">
      <PageHeading
        eyebrow={`Chapter Command / ${chapterId.toUpperCase()}`}
        title={`${chapterName} Operations`}
        description="Event oversight, crew registration review, roster verification, and division management."
        action={
          <div className="flex gap-2">
            <Link href={`/admin/${chapterId}/events/new`} className="button button-outline">
              + Create Event
            </Link>
            <Link href={`/admin/${chapterId}/events/manila-session-2027/registrations`} className="button button-volt">
              Review Queue (1 Pending) <Arrow />
            </Link>
          </div>
        }
      />

      {/* Metric Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded bg-carbon border border-subtle">
          <span className="text-xs text-titanium block mb-1">Active Events</span>
          <strong className="text-2xl mono text-chrome">1 Active</strong>
          <span className="text-xs text-volt block mt-1">Manila Session 2027</span>
        </div>

        <div className="p-4 rounded bg-carbon border border-subtle">
          <span className="text-xs text-titanium block mb-1">Registered Crews</span>
          <strong className="text-2xl mono text-chrome">14 Crews</strong>
          <span className="text-xs text-titanium block mt-1">Across 5 divisions</span>
        </div>

        <div className="p-4 rounded bg-carbon border border-subtle">
          <span className="text-xs text-titanium block mb-1">Pending Entry Reviews</span>
          <strong className="text-2xl mono text-amber-400">1 Queue Item</strong>
          <span className="text-xs text-amber-400 block mt-1">Ready for registrar sign-off</span>
        </div>

        <div className="p-4 rounded bg-carbon border border-subtle">
          <span className="text-xs text-titanium block mb-1">Minor Consents</span>
          <strong className="text-2xl mono text-volt">100% Verified</strong>
          <span className="text-xs text-titanium block mt-1">Zero outstanding waivers</span>
        </div>
      </div>

      <div className="dashboard-columns">
        {/* Active Events Overview */}
        <section className="panel">
          <div className="panel-heading">
            <h2>Active Chapter Events</h2>
            <Link href={`/admin/${chapterId}/events`} className="text-link text-xs">
              Manage All Events <Arrow />
            </Link>
          </div>

          <div className="readiness-row">
            <span className="check-disc complete" aria-hidden="true">★</span>
            <div>
              <strong>Manila Session 2027</strong>
              <p>July 18, 2027 · SMX Convention Center · Active Registration</p>
            </div>
            <Link href={`/admin/${chapterId}/events/manila-session-2027`} className="button button-outline text-xs">
              Command Center <Arrow />
            </Link>
          </div>

          <div className="readiness-row">
            <span className="check-disc" aria-hidden="true">Q</span>
            <div>
              <strong>Hong Kong World Championship 2027</strong>
              <p>November 18–21, 2027 · Queen Elizabeth Stadium · International Final</p>
            </div>
            <span className="muted text-xs">HQ Synchronized</span>
          </div>
        </section>

        {/* Quick Review Alert Box */}
        <aside className="event-mini">
          <span className="eyebrow">Registrar Priority</span>
          <h2>Entry Awaiting Review</h2>
          <p className="text-xs leading-relaxed text-titanium">
            <strong>Afterhours Collective</strong> submitted their Open Crew entry. All 4 readiness vectors (Roster, Music, Consent, Payment) are complete.
          </p>
          <div className="mini-event-divider" />
          <Link
            href={`/admin/${chapterId}/events/manila-session-2027/registrations/entry-manila-open-1`}
            className="button button-volt w-full text-center"
          >
            Inspect & Sign Off <Arrow />
          </Link>
        </aside>
      </div>

      {/* Chapter Action Grid */}
      <section className="panel mt-6">
        <div className="panel-heading">
          <h2>Administrative Modules</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <Link
            href={`/admin/${chapterId}/events/manila-session-2027/registrations`}
            className="p-4 rounded bg-tungsten hover:bg-tungsten/80 transition-colors border border-subtle block"
          >
            <strong className="text-chrome text-base block mb-1">Registration Queue</strong>
            <p className="text-xs text-titanium">Inspect submitted rosters, download audio cuts, and verify guardian waivers.</p>
          </Link>

          <Link
            href={`/admin/${chapterId}/events/manila-session-2027/divisions`}
            className="p-4 rounded bg-tungsten hover:bg-tungsten/80 transition-colors border border-subtle block"
          >
            <strong className="text-chrome text-base block mb-1">Divisions & Rules</strong>
            <p className="text-xs text-titanium">Configure age limits, roster headcount bounds, music duration caps, and fees.</p>
          </Link>

          <Link
            href={`/admin/${chapterId}/staff`}
            className="p-4 rounded bg-tungsten hover:bg-tungsten/80 transition-colors border border-subtle block"
          >
            <strong className="text-chrome text-base block mb-1">Staff & Assignments</strong>
            <p className="text-xs text-titanium">Manage stage directors, registrars, and accredited head judges for this chapter.</p>
          </Link>
        </div>
      </section>
    </main>
  );
}