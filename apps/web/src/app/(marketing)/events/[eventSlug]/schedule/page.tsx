"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status, Button, StatCard } from "@/components/ui";

export default function PublicEventSchedulePage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = use(params);

  const [activeDay, setActiveDay] = useState("day1");

  const timetable = [
    {
      time: "09:00 PHT",
      division: "Doors & Accreditation Open",
      detail: "Participant check-in, wristband issuance, and warm-up studio access.",
      status: "Completed",
      tone: "neutral" as const,
    },
    {
      time: "10:30 PHT",
      division: "Young Guns & Varsity Divisions",
      detail: "Junior division prelims and finals. 14 routines scheduled.",
      status: "Completed",
      tone: "neutral" as const,
    },
    {
      time: "14:00 PHT",
      division: "Open Crew Championship",
      detail: "Premier open division prelims. 18 international and national crews.",
      status: "Live On Stage",
      tone: "volt" as const,
    },
    {
      time: "16:30 PHT",
      division: "Monster Crew Championship",
      detail: "Mega crew showdown. 12 elite crews of 20–40 dancers.",
      status: "Upcoming",
      tone: "amber" as const,
    },
    {
      time: "19:00 PHT",
      division: "BG.ONE Street Battle Finals (1v1)",
      detail: "Quarterfinals, Semifinals, and World Final Clash under arena lights.",
      status: "Upcoming",
      tone: "neutral" as const,
    },
    {
      time: "21:30 PHT",
      division: "Official Awards & Podium Ceremony",
      detail: "Medal presentation and World Championship seed announcements.",
      status: "Upcoming",
      tone: "neutral" as const,
    },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeading
          eyebrow="Official Timetable"
          title={`${eventSlug.replace(/-/g, " ").toUpperCase()} · Stage Schedule`}
          description="Real-time performance timetable for dancers, directors, and spectators. Timings update live as divisions progress."
        />
        <div className="flex gap-2">
          <Link
            href={`/events/${eventSlug}/live`}
            className="button button-volt"
            style={{ minHeight: "48px" }}
          >
            Watch Live Stream <Arrow />
          </Link>
          <Link
            href={`/events/${eventSlug}/results`}
            className="button button-secondary"
            style={{ minHeight: "48px" }}
          >
            Live Results <Arrow diagonal />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Current Stage" value="Open Crew" meta="Routines in progress" tone="volt" />
        <StatCard label="Stage Floor" value="Main Arena" meta="Court A" />
        <StatCard label="Schedule Flow" value="On Time" meta="Zero delay" tone="volt" />
        <StatCard label="Next Up" value="Monster Crew" meta="Starts 16:30 PHT" tone="amber" />
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-chrome">Day Timetable</h2>
        <div className="space-y-3">
          {timetable.map((slot, i) => (
            <div
              key={i}
              className={`panel p-6 bg-carbon border ${
                slot.status === "Live On Stage"
                  ? "border-volt ring-1 ring-volt"
                  : "border-subtle"
              } rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="mono text-sm font-bold text-volt">{slot.time}</span>
                  <Status tone={slot.tone}>{slot.status}</Status>
                </div>
                <h3 className="text-xl font-bold text-chrome">{slot.division}</h3>
                <p className="text-sm text-titanium">{slot.detail}</p>
              </div>

              {slot.status === "Live On Stage" && (
                <Link
                  href={`/events/${eventSlug}/live`}
                  className="button button-volt"
                  style={{ minHeight: "44px" }}
                >
                  Tune In Now <Arrow />
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
