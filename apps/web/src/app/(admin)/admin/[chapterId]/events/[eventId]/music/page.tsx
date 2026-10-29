"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status, Button, StatCard } from "@/components/ui";

export default function AdminEventMusicPage({
  params,
}: {
  params: Promise<{ chapterId: string; eventId: string }>;
}) {
  const { chapterId, eventId } = use(params);

  const [tracks, setTracks] = useState([
    {
      entry: "011",
      crew: "Urban Pulse",
      fileName: "UrbanPulse_WSB2027_Master.mp3",
      duration: "2:24",
      limit: "2:30",
      lufs: "-14.2 LUFS",
      cleanEdit: true,
      cue: "Stage Entrance with music",
      status: "Approved",
      tone: "volt" as const,
    },
    {
      entry: "012",
      crew: "Legion X",
      fileName: "LegionX_Round1_PH.mp3",
      duration: "2:25",
      limit: "2:30",
      lufs: "-14.0 LUFS",
      cleanEdit: true,
      cue: "Stage Entrance with music",
      status: "Approved",
      tone: "volt" as const,
    },
    {
      entry: "014",
      crew: "Afterhours Collective",
      fileName: "Afterhours_MegaMix_Final_Master_v2.mp3",
      duration: "2:28",
      limit: "2:30",
      lufs: "-13.8 LUFS",
      cleanEdit: true,
      cue: "Stage Entrance with music",
      status: "Approved",
      tone: "volt" as const,
    },
    {
      entry: "015",
      crew: "Alliance Project",
      fileName: "Alliance_WSB2027_CompetitionEdit.wav",
      duration: "2:29",
      limit: "2:30",
      lufs: "-14.1 LUFS",
      cleanEdit: true,
      cue: "Walk to center stage before audio",
      status: "Approved",
      tone: "volt" as const,
    },
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeading
          eyebrow={`Chapter / ${chapterId.toUpperCase()} / Events`}
          title="Music Compliance & Soundcheck Readiness"
          description={`Audit audio submissions for Event #${eventId}, verify profanity-free clean edits, track durations, and broadcast loudness compliance.`}
        />
        <Button
          variant="secondary"
          onClick={() => alert("Packaging all verified tracks into WSB_Event_Audio_Master.zip")}
          style={{ minHeight: "48px" }}
        >
          Download Master ZIP Package
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Uploaded Tracks" value={`${tracks.length} / ${tracks.length}`} meta="100% on file" tone="volt" />
        <StatCard label="Duration Rules" value="Pass (0 Over)" meta="Max 2m 30s ceiling" tone="volt" />
        <StatCard label="Clean Edits" value="100% Cleared" meta="No unrated lyric flags" />
        <StatCard label="Broadcast Delivery" value="Ready" meta="Synced to DJ desk" />
      </div>

      <div className="panel bg-carbon border border-subtle overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-subtle text-xs mono text-titanium">
              <th className="p-4">Entry</th>
              <th className="p-4">Crew</th>
              <th className="p-4">Track File</th>
              <th className="p-4">Duration</th>
              <th className="p-4">Loudness</th>
              <th className="p-4">Cue Point</th>
              <th className="p-4">Compliance</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-subtle">
            {tracks.map((t) => (
              <tr key={t.entry} className="hover:bg-subtle/30 transition-colors">
                <td className="p-4 mono font-bold text-volt">#{t.entry}</td>
                <td className="p-4 font-bold text-chrome">{t.crew}</td>
                <td className="p-4 mono text-xs text-titanium truncate max-w-[200px]">{t.fileName}</td>
                <td className="p-4 mono text-xs text-chrome">{t.duration} / {t.limit}</td>
                <td className="p-4 mono text-xs text-titanium">{t.lufs}</td>
                <td className="p-4 text-xs text-titanium">{t.cue}</td>
                <td className="p-4">
                  <Status tone={t.tone}>{t.status}</Status>
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => alert(`Downloading ${t.fileName}`)}
                    className="button button-ghost text-xs"
                  >
                    Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
