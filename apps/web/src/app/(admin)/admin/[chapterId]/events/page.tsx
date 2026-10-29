"use client";

import { use } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status } from "@/components/ui";

export default function EventManagementPage({
  params,
}: {
  params: Promise<{ chapterId: string }>;
}) {
  const { chapterId } = use(params);

  const events = [
    {
      id: "manila-session-2027",
      name: "Manila Session 2027",
      date: "July 18, 2027",
      venue: "SMX Convention Center, Manila",
      status: "active",
      entriesCount: 14,
      rulesVersion: "2027.1",
    },
    {
      id: "ph-qualifier-north-2027",
      name: "WSB Luzon Regional Qualifier 2027",
      date: "September 05, 2027",
      venue: "Baguio Convention Center",
      status: "draft",
      entriesCount: 0,
      rulesVersion: "2027.1",
    },
  ];

  return (
    <main id="main-content" className="workspace-main">
      <PageHeading
        eyebrow={`Chapter Command / ${chapterId.toUpperCase()}`}
        title="Event Management"
        description="Configure championship rounds, set registration cutoffs, and monitor stage readiness."
        action={
          <Link href={`/admin/${chapterId}/events/new`} className="button button-volt">
            + Create New Event <Arrow />
          </Link>
        }
      />

      <div className="space-y-4">
        {events.map((ev) => (
          <div key={ev.id} className="panel p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Status tone={ev.status === "active" ? "volt" : "amber"}>
                  {ev.status.toUpperCase()}
                </Status>
                <span className="mono text-xs text-titanium">Rules v{ev.rulesVersion}</span>
              </div>
              <h2 className="text-xl font-bold text-chrome">{ev.name}</h2>
              <p className="text-xs text-titanium mt-1">
                {ev.date} · {ev.venue} · <strong className="text-chrome mono">{ev.entriesCount} registered entries</strong>
              </p>
            </div>

            <div className="flex gap-2 w-full md:w-auto">
              <Link href={`/admin/${chapterId}/events/${ev.id}/registrations`} className="button button-outline text-xs">
                Registrations ({ev.entriesCount})
              </Link>
              <Link href={`/admin/${chapterId}/events/${ev.id}/divisions`} className="button button-outline text-xs">
                Divisions
              </Link>
              <Link href={`/admin/${chapterId}/events/${ev.id}`} className="button button-volt text-xs">
                Command Center <Arrow />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}