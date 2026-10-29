"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status, Button, StatCard } from "@/components/ui";

export default function SpectatorLiveHubPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = use(params);

  const [cheers, setCheers] = useState(14820);
  const [hasCheered, setHasCheered] = useState(false);

  const handleCheer = () => {
    setCheers((c) => c + 1);
    setHasCheered(true);
    setTimeout(() => setHasCheered(false), 800);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeading
          eyebrow="Official Livestream Feed"
          title={`${eventSlug.replace(/-/g, " ").toUpperCase()} · Arena Live`}
          description="Broadcast feed from the main stage. High-definition multi-camera coverage of every championship routine and street battle clash."
        />
        <div className="flex gap-2">
          <Link
            href={`/events/${eventSlug}/results`}
            className="button button-volt"
            style={{ minHeight: "48px" }}
          >
            Live Leaderboard <Arrow />
          </Link>
          <Link
            href={`/events/${eventSlug}/schedule`}
            className="button button-secondary"
            style={{ minHeight: "48px" }}
          >
            Full Timetable <Arrow diagonal />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Live Spectators" value="14,290" meta="Worldwide stream" tone="volt" />
        <StatCard label="Stream Quality" value="1080p 60fps" meta="Low-latency CDN" />
        <StatCard label="Active Division" value="Open Crew" meta="Routine #014 on stage" tone="volt" />
        <StatCard label="Community Cheers" value={cheers.toLocaleString()} meta="Live fan reactions" tone="amber" />
      </div>

      {/* STREAM PLAYER CONTAINER */}
      <div className="panel p-0 bg-obsidian border-2 border-subtle rounded-2xl overflow-hidden shadow-2xl">
        <div className="aspect-video bg-carbon flex flex-col justify-between p-6 relative">
          <div className="flex justify-between items-center z-10">
            <span className="badge badge-crimson animate-pulse font-bold mono">
              ● LIVE BROADCAST
            </span>
            <span className="mono text-xs text-titanium bg-obsidian/80 px-3 py-1 rounded">
              MAIN STAGE FEED · CAM 1
            </span>
          </div>

          <div className="text-center my-auto space-y-3 z-10">
            <span className="mono text-volt text-sm">NOW ON ARENA FLOOR</span>
            <h2 className="text-4xl md:text-5xl font-black text-white">
              AFTERHOURS COLLECTIVE
            </h2>
            <p className="text-titanium text-sm">
              Entry #014 · Open Crew Division · Manila, Philippines
            </p>
          </div>

          <div className="flex justify-between items-center z-10 pt-4 border-t border-subtle/50 text-xs mono text-titanium">
            <span>BITRATE: 6,500 kbps (H.264)</span>
            <span>AUDIO: Stereo PCM 48kHz</span>
          </div>
        </div>

        {/* INTERACTIVE CHEER BAR */}
        <div className="p-6 bg-carbon border-t border-subtle flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h4 className="font-bold text-chrome">Cheer for the Crew on Floor!</h4>
            <p className="text-xs text-titanium">
              Tap cheer to send visual energy to the arena stage monitor.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={handleCheer}
            style={{ minHeight: "48px", minWidth: "180px" }}
          >
            {hasCheered ? "FIRE SENT! 🔥" : "DROP CHEER 🔥"}
          </Button>
        </div>
      </div>
    </div>
  );
}
