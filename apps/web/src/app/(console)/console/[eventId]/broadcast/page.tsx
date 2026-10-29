"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Arrow, Brand, PageHeading, Status, Button, StatCard } from "@/components/ui";

export default function BroadcastControlPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);

  const [activeScene, setActiveScene] = useState("performing");
  const [tickerText, setTickerText] = useState("WORLD SUPREMACY BATTLEGROUNDS · MANILA SESSION 2027 · PRESENTED BY MONSTER ENERGY");
  const [pushStatus, setPushStatus] = useState("Synced");

  const scenes = [
    {
      id: "performing",
      name: "Now Performing HUD",
      desc: "Displays active crew name, origin country, routine title, and live stage timer.",
      url: `/arena-live/${eventId}`,
    },
    {
      id: "results",
      name: "Podium & Result Reveal",
      desc: "Full-screen championship celebration with Gold/Silver/Bronze medals and score totals.",
      url: `/arena-live/${eventId}/results`,
    },
    {
      id: "bracket",
      name: "BG.ONE Battle Bracket",
      desc: "Live 1v1 Street battle tournament tree and corner scorecards.",
      url: `/arena-live/${eventId}/bracket`,
    },
    {
      id: "holding",
      name: "Arena Holding Scene",
      desc: "Atmospheric motion loop, next division countdown, and global sponsors.",
      url: `/arena-live/${eventId}/holding`,
    },
  ];

  const handlePushScene = (sceneId: string) => {
    setActiveScene(sceneId);
    setPushStatus("Pushing to LED...");
    setTimeout(() => {
      setPushStatus("Active on Main LED");
    }, 600);
  };

  return (
    <div className="judge-shell">
      <header className="judge-header">
        <Brand />
        <div className="judge-event">
          <strong>Broadcast & LED Graphics Desk</strong>
          <span>Event Desk #{eventId} · Arena Video Master</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href={`/arena-live/${eventId}`} target="_blank" className="text-link">
            Launch LED Output <Arrow diagonal />
          </Link>
          <Link href="/console" className="text-link">
            Console Hub <Arrow diagonal />
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <PageHeading
            eyebrow="Vision Mixer & Lower-Third Engine"
            title="Arena LED & Broadcast Controller"
            description="Control the stadium LED displays, livestream graphics overlays, lower-third tickers, and live score reveal animations in real-time."
          />
          <Status tone={activeScene === "holding" ? "amber" : "volt"}>{pushStatus}</Status>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="Current LED Scene" value={scenes.find(s => s.id === activeScene)?.name || activeScene} meta="On air" tone="volt" />
          <StatCard label="Display Resolution" value="3840 x 2160" meta="4K UHD 60fps" />
          <StatCard label="Connected Screens" value="4 Displays" meta="Center Stage + 2 Wings + Stream" />
          <StatCard label="Sync Latency" value="8ms" meta="WebSocket broadcast bus" />
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-chrome">Arena Scene Presets</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {scenes.map((scene) => (
              <div
                key={scene.id}
                className={`panel p-6 bg-carbon border ${
                  activeScene === scene.id
                    ? "border-volt ring-2 ring-volt/40"
                    : "border-subtle"
                } rounded-xl space-y-4 flex flex-col justify-between`}
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-chrome">{scene.name}</h3>
                    {activeScene === scene.id ? (
                      <span className="badge badge-volt">ON AIR</span>
                    ) : (
                      <span className="badge badge-neutral">Standby</span>
                    )}
                  </div>
                  <p className="text-sm text-titanium">{scene.desc}</p>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-subtle">
                  <Button
                    variant={activeScene === scene.id ? "primary" : "secondary"}
                    onClick={() => handlePushScene(scene.id)}
                    style={{ minHeight: "48px" }}
                    className="flex-1"
                  >
                    {activeScene === scene.id ? "Live On Air" : "Take to Program (Push)"}
                  </Button>
                  <Link
                    href={scene.url}
                    target="_blank"
                    className="button button-ghost"
                    style={{ minHeight: "48px" }}
                  >
                    Preview <Arrow diagonal />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* LOWER THIRD TICKER CONTROLLER */}
        <section className="panel p-6 bg-carbon border border-subtle space-y-4">
          <h2 className="text-xl font-bold text-chrome">Live Lower-Third Banner & Ticker</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={tickerText}
              onChange={(e) => setTickerText(e.target.value)}
              className="input flex-1"
              style={{ minHeight: "48px" }}
            />
            <Button variant="secondary" style={{ minHeight: "48px" }}>
              Update Ticker
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
