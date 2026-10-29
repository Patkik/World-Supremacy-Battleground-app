"use client";

import Link from "next/link";
import { Arrow, Brand, PageHeading, Status } from "@/components/ui";

export default function ConsoleDutySelectionPage() {
  const duties = [
    {
      title: "Accredited Judge",
      desc: "Live 100-point criteria scoring and outbox management for assigned divisions.",
      href: "/console/manila-session-2027/judge",
      role: "Official Judge",
      status: "Active Session",
    },
    {
      title: "Head Judge",
      desc: "Division scoring locks, review completion matrix, and final score publication.",
      href: "/console/manila-session-2027/head-judge",
      role: "Head Judge",
      status: "Authorized",
    },
    {
      title: "Stage Marshal",
      desc: "On-deck call sequencing, backstage lineup monitoring, and stage transitions.",
      href: "/console/manila-session-2027/marshal",
      role: "Stage Operations",
      status: "Ready",
    },
    {
      title: "Check-in Scanner",
      desc: "Dancer QR badge scanning, minor guardian check, and venue pass verification.",
      href: "/console/manila-session-2027/check-in",
      role: "Venue Access",
      status: "Ready",
    },
    {
      title: "Battle Controller",
      desc: "1v1 B-Boy & 2v2 BG.ONE bracket management, timer control, and judge vote tallies.",
      href: "/console/manila-session-2027/battles",
      role: "Battle Marshal",
      status: "Live",
    },
    {
      title: "DJ & Audio Desk",
      desc: "Performance audio track playback, master loudness verification, and stage cues.",
      href: "/console/manila-session-2027/audio",
      role: "Audio Director",
      status: "Online",
    },
    {
      title: "Broadcast HUD Control",
      desc: "Arena LED scoreboard scenes, result reveals, and livestream overlays.",
      href: "/console/manila-session-2027/broadcast",
      role: "Media Producer",
      status: "Standby",
    },
    {
      title: "Device & Sync Hub",
      desc: "Offline command outbox monitor, local storage state, and server sync.",
      href: "/console/manila-session-2027/sync",
      role: "Tech Marshal",
      status: "Synced",
    },
  ];

  return (
    <main className="min-h-screen p-6 md:p-12 bg-obsidian max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8 pb-4 border-b border-subtle">
        <Brand />
        <Link href="/app" className="button button-outline text-xs">
          ← Exit to Crew Portal
        </Link>
      </div>

      <PageHeading
        eyebrow="Tactical Event Console / Manila Session 2027"
        title="Operational Duty Selection"
        description="Select your accredited role to initialize the low-latency venue workstation."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {duties.map((d) => (
          <Link
            key={d.title}
            href={d.href}
            className="panel p-6 hover:border-volt transition-colors block group"
          >
            <div className="flex justify-between items-start mb-3">
              <span className="mono text-xs text-titanium">{d.role}</span>
              <Status tone="volt">{d.status}</Status>
            </div>
            <h2 className="text-xl font-bold text-chrome group-hover:text-volt transition-colors mb-2">
              {d.title}
            </h2>
            <p className="text-xs text-titanium leading-relaxed mb-4">{d.desc}</p>
            <span className="text-xs text-volt font-bold flex items-center gap-1">
              Launch Console <Arrow />
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}