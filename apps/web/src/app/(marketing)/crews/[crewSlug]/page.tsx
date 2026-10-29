"use client";

import { use } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status, Button, StatCard } from "@/components/ui";

export default function PublicCrewProfilePage({
  params,
}: {
  params: Promise<{ crewSlug: string }>;
}) {
  const { crewSlug } = use(params);

  const crew = {
    name: "Afterhours Collective",
    slug: crewSlug,
    country: "Philippines",
    city: "Manila, Metro Manila",
    founded: "2018",
    director: "Marcus Vance",
    headquarters: "The Movement Studio QC",
    bio: "Afterhours Collective is a high-energy urban dance force combining intricate musicality, polyrhythmic isolations, and acrobatic staging. Reigning Open Crew Champions of Manila Session 2027.",
    stats: {
      worldRank: "#1 Global",
      trophies: "7 Championships",
      activeRoster: "12 Dancers",
      bestScore: "88.33 pts",
    },
    honors: [
      { title: "Champion - Manila Session 2027", division: "Open Crew", score: "88.33" },
      { title: "Silver Medal - Sydney World Finals 2026", division: "Open Crew", score: "86.10" },
      { title: "Champion - Philippine National Finals 2025", division: "Varsity", score: "87.40" },
    ],
    roster: [
      { name: "Carlos Miguel Santos", alias: "B-Boy Spinx", style: "Breaking & Footwork" },
      { name: "Andrea Nicole Reyes", alias: "Drea", style: "Waacking & Locking" },
      { name: "Justin Lee", alias: "J-Roc", style: "Hip Hop & Staging" },
      { name: "Chloe Valenzuela", alias: "Koko", style: "Popping & Animation" },
    ],
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeading
          eyebrow="Official WSB Registered Crew"
          title={crew.name}
          description={`${crew.city} · Founded ${crew.founded} · Directed by ${crew.director}`}
        />
        <div className="flex gap-2">
          <Link href="/rankings" className="button button-secondary" style={{ minHeight: "48px" }}>
            World Rankings <Arrow diagonal />
          </Link>
          <Link href="/contact" className="button button-volt" style={{ minHeight: "48px" }}>
            Inquire & Connect <Arrow />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="World Ranking" value={crew.stats.worldRank} meta="Open Crew Leader" tone="volt" />
        <StatCard label="Championships" value={crew.stats.trophies} meta="International Titles" tone="volt" />
        <StatCard label="Roster Size" value={crew.stats.activeRoster} meta="Accredited Dancers" />
        <StatCard label="Highest Score" value={crew.stats.bestScore} meta="Trimmed Olympic Mean" />
      </div>

      <div className="panel p-6 bg-carbon border border-subtle rounded-xl space-y-4">
        <h3 className="text-xl font-bold text-chrome">About the Collective</h3>
        <p className="text-titanium leading-relaxed">{crew.bio}</p>
        <p className="text-xs mono text-titanium pt-2 border-t border-subtle">
          Home Base: <strong className="text-white">{crew.headquarters}</strong> · Chapter: <strong className="text-volt">{crew.country}</strong>
        </p>
      </div>

      {/* TROPHY CABINET & HONORS */}
      <section className="panel p-6 bg-carbon border border-subtle rounded-xl space-y-4">
        <h3 className="text-xl font-bold text-chrome">Championship Honors</h3>
        <div className="space-y-3">
          {crew.honors.map((h, i) => (
            <div key={i} className="p-4 bg-obsidian border border-subtle rounded-lg flex justify-between items-center">
              <div>
                <strong className="block text-chrome text-lg">{h.title}</strong>
                <span className="text-xs text-titanium">{h.division}</span>
              </div>
              <div className="text-right">
                <span className="mono font-bold text-volt text-lg">{h.score} pts</span>
                <span className="text-[10px] text-titanium block mono">OFFICIAL TOTAL</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURED ROSTER */}
      <section className="panel p-6 bg-carbon border border-subtle rounded-xl space-y-4">
        <h3 className="text-xl font-bold text-chrome">Featured Dancers</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {crew.roster.map((d) => (
            <div key={d.name} className="p-4 bg-obsidian border border-subtle rounded-lg space-y-1">
              <span className="badge badge-volt text-[10px] mono">{d.alias}</span>
              <h4 className="font-bold text-chrome text-sm">{d.name}</h4>
              <p className="text-xs text-titanium">{d.style}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
