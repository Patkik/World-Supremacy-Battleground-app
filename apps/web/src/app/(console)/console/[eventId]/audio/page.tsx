"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Arrow, Brand, PageHeading, Status, Button, StatCard } from "@/components/ui";

export default function DjAudioDeskPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);

  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSeconds, setPlaybackSeconds] = useState(48);

  const tracks = [
    {
      entry: "014",
      crew: "Afterhours Collective",
      trackName: "Afterhours_MegaMix_Final_Master_v2.mp3",
      duration: "2:28",
      cue: "Stage Entrance with music",
      lufs: "-13.8 LUFS",
      cleanEdit: true,
      status: "Loaded in Deck A",
      tone: "volt" as const,
    },
    {
      entry: "015",
      crew: "Alliance Project",
      trackName: "Alliance_WSB2027_CompetitionEdit.wav",
      duration: "2:29",
      cue: "Walk to center stage before audio",
      lufs: "-14.1 LUFS",
      cleanEdit: true,
      status: "Queued Deck B",
      tone: "amber" as const,
    },
    {
      entry: "012",
      crew: "Legion X",
      trackName: "LegionX_Round1_PH.mp3",
      duration: "2:25",
      cue: "Stage Entrance with music",
      lufs: "-14.0 LUFS",
      cleanEdit: true,
      status: "Cached Ready",
      tone: "neutral" as const,
    },
  ];

  return (
    <div className="judge-shell">
      <header className="judge-header">
        <Brand />
        <div className="judge-event">
          <strong>Production DJ & Audio Desk</strong>
          <span>Event Desk #{eventId} · Arena Sound Master</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href={`/console/${eventId}/marshal`} className="text-link">
            Marshal Desk <Arrow diagonal />
          </Link>
          <Link href="/console" className="text-link">
            Console Hub <Arrow diagonal />
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-8">
        <PageHeading
          eyebrow="Acoustic Master Controller"
          title="Routine Audio Desk & Playback Engine"
          description="Manage certified routine tracks, cue stage entrance audio, monitor broadcast audio levels, and trigger instant failover playback."
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="Deck A (Active)" value="Entry #014" meta="Afterhours Collective" tone="volt" />
          <StatCard label="Deck B (Standby)" value="Entry #015" meta="Alliance Project" tone="amber" />
          <StatCard label="Loudness Limit" value="-14.0 LUFS" meta="EBU R128 Compliant" />
          <StatCard label="DAC Interface" value="Dante 48kHz" meta="Hardware sync locked" />
        </div>

        {/* PRIMARY DECK A PLAYBACK HUD */}
        <section className="panel p-8 bg-carbon border-2 border-volt rounded-xl space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Status tone="volt">DECK A · ON AIR</Status>
                <span className="mono text-xs text-titanium">ENTRY #014</span>
              </div>
              <h2 className="text-3xl font-black text-chrome">Afterhours Collective</h2>
              <p className="mono text-sm text-volt">{tracks[0].trackName}</p>
            </div>
            <div className="text-right">
              <span className="mono text-4xl font-extrabold text-white">
                0:{playbackSeconds < 10 ? `0${playbackSeconds}` : playbackSeconds} / {tracks[0].duration}
              </span>
              <p className="text-xs text-titanium mt-1">Audio Cue: {tracks[0].cue}</p>
            </div>
          </div>

          {/* SIMULATED AUDIO WAVEFORM */}
          <div className="h-20 bg-obsidian border border-subtle rounded-lg flex items-center px-4 gap-1 overflow-hidden">
            {Array.from({ length: 64 }).map((_, i) => {
              const height = ((i * 13) % 45) + 10;
              const isPast = (i / 64) * 148 <= playbackSeconds;
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-sm transition-all ${
                    isPast ? "bg-volt" : "bg-subtle"
                  }`}
                  style={{ height: `${height}px` }}
                />
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-3">
              <Button
                variant={isPlaying ? "danger" : "primary"}
                onClick={() => setIsPlaying(!isPlaying)}
                style={{ minHeight: "52px", minWidth: "160px" }}
              >
                {isPlaying ? "PAUSE PLAYBACK" : "PLAY ROUTINE AUDIO"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setPlaybackSeconds(0)}
                style={{ minHeight: "52px" }}
              >
                CUE TO START (0:00)
              </Button>
            </div>

            <div className="flex items-center gap-4 text-xs mono text-titanium">
              <span>FORMAT: 44.1kHz 24-bit PCM</span>
              <span>CLEAN EDIT: CERTIFIED</span>
              <button className="button button-ghost text-xs">Download Backup MP3</button>
            </div>
          </div>
        </section>

        {/* QUEUED TRACKS */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-chrome">Performance Audio Queue</h2>
          <div className="space-y-3">
            {tracks.map((t) => (
              <div
                key={t.entry}
                className="panel p-4 bg-carbon border border-subtle flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="mono text-xs text-titanium">Entry #{t.entry}</span>
                    <Status tone={t.tone}>{t.status}</Status>
                  </div>
                  <h4 className="font-bold text-chrome">{t.crew}</h4>
                  <p className="text-xs text-titanium mono">{t.trackName} · Duration: {t.duration} · Loudness: {t.lufs}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" style={{ minHeight: "44px" }}>
                    Load to Deck
                  </Button>
                  <Button variant="secondary" style={{ minHeight: "44px" }}>
                    Soundcheck Cue
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
