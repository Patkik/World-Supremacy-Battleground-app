"use client";

import Link from "next/link";
import { Arrow, PageHeading, Status, Button, StatCard } from "@/components/ui";

export default function StudiosDirectoryPage() {
  const studios = [
    {
      name: "The Movement Studio QC",
      location: "Quezon City, Philippines",
      director: "Marcus Vance",
      styles: "Hip Hop, Choreo & Staging",
      tier: "Official National Hub",
      crewsCount: 6,
      phone: "+63 2 8920 1144",
      tone: "volt" as const,
    },
    {
      name: "Sydney Urban Arts Academy",
      location: "Parramatta, Sydney, Australia",
      director: "Kylie Tran",
      styles: "Breaking, Popping & Waacking",
      tier: "Certified Training Academy",
      crewsCount: 8,
      phone: "+61 2 9680 4410",
      tone: "volt" as const,
    },
    {
      name: "Studio Cypher Shibuya",
      location: "Tokyo, Japan",
      director: "Kenjiro Takahashi",
      styles: "All Styles & BG.ONE Battling",
      tier: "Regional Battle Training Center",
      crewsCount: 5,
      phone: "+81 3 5410 8820",
      tone: "neutral" as const,
    },
    {
      name: "Auckland Movement Lab",
      location: "Auckland, New Zealand",
      director: "Tane Williams",
      styles: "Megacrew & Junior Development",
      tier: "Accredited Youth Academy",
      crewsCount: 4,
      phone: "+64 9 370 2200",
      tone: "neutral" as const,
    },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeading
          eyebrow="Global Training & Rehearsal Network"
          title="Accredited Dance Studios & Academies"
          description="Find official WSB-affiliated dance hubs, training grounds, and certified studios offering masterclasses and competitive crew preparation."
        />
        <Link href="/community/apply" className="button button-volt" style={{ minHeight: "48px" }}>
          Apply as Studio Hub <Arrow />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Affiliated Studios" value="48 Studios" meta="Worldwide network" tone="volt" />
        <StatCard label="Dancers Trained" value="8,500+" meta="Enrolled per season" />
        <StatCard label="Masterclasses" value="120+ / yr" meta="With WSB Head Judges" tone="volt" />
        <StatCard label="Certified Programs" value="Level 1–4" meta="Judges & Coaches" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {studios.map((s) => (
          <div
            key={s.name}
            className="panel p-6 bg-carbon border border-subtle hover:border-volt transition-colors rounded-xl flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <span className="badge badge-volt mono text-xs">{s.tier}</span>
                <span className="text-xs text-titanium mono">{s.crewsCount} Active Crews</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-chrome">{s.name}</h3>
                <p className="text-sm text-titanium font-medium">{s.location}</p>
              </div>
              <p className="text-xs text-titanium">
                Director: <strong className="text-white">{s.director}</strong> · Specialization: <span className="text-volt">{s.styles}</span>
              </p>
            </div>

            <div className="pt-4 border-t border-subtle flex justify-between items-center text-xs">
              <span className="mono text-titanium">{s.phone}</span>
              <Link href="/contact" className="text-link">
                Inquire & Book Rehearsal <Arrow diagonal />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
