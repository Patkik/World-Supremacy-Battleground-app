"use client";

import Link from "next/link";
import { Arrow, PageHeading, Status, Button, StatCard } from "@/components/ui";

export default function GlobalRuleLibraryPage() {
  const divisions = [
    {
      name: "Open Crew Division",
      roster: "5–16 Dancers",
      age: "Min 14 Years (No upper ceiling)",
      duration: "2:00–2:30 Max",
      stageLimits: "12m x 10m Arena Stage",
      status: "Active Standard",
    },
    {
      name: "Monster Crew Division",
      roster: "20–40 Dancers",
      age: "All Ages Open",
      duration: "3:00–4:00 Max",
      stageLimits: "Full Arena Stage Required",
      status: "Active Standard",
    },
    {
      name: "Young Guns Division",
      roster: "5–16 Dancers",
      age: "Max 14 Years (Junior)",
      duration: "2:00–2:30 Max",
      stageLimits: "12m x 10m Arena Stage",
      status: "Active Standard",
    },
    {
      name: "Varsity Division",
      roster: "5–16 Dancers",
      age: "13–18 Years (High School)",
      duration: "2:00–2:30 Max",
      stageLimits: "12m x 10m Arena Stage",
      status: "Active Standard",
    },
    {
      name: "BG.ONE Street Battle",
      roster: "1v1 Clash",
      age: "Open Category",
      duration: "2 Rounds (60s / round)",
      stageLimits: "Center Stage Cypher Ring",
      status: "Active Standard",
    },
  ];

  const rubric = [
    { name: "Execution & Synchronization", points: 30, desc: "Technical difficulty, footwork accuracy, unison, isolations, cleanliness." },
    { name: "Choreography & Staging", points: 25, desc: "Formations, transitions, geometric spatial coverage, level contrasts." },
    { name: "Creativity & Originality", points: 20, desc: "Signature concepts, novel textures, narrative integration, freshness." },
    { name: "Musicality & Dynamics", points: 15, desc: "Polyrhythmic accents, tempo control, micro-timing, dynamic expression." },
    { name: "Stage Presence & Showmanship", points: 10, desc: "Audience projection, eye contact, character integrity, battle energy." },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeading
          eyebrow="Global Technical Committee"
          title="Official Rulebook & Division Specifications"
          description="Authoritative competitive guidelines, division constraints, scoring rubric weights, and penalty frameworks enforced across all chapters."
        />
        <div className="flex gap-2">
          <Link href="/hq" className="button button-secondary" style={{ minHeight: "48px" }}>
            HQ Overview <Arrow diagonal />
          </Link>
          <Button
            variant="secondary"
            onClick={() => alert("Downloading official WSB_Rulebook_Edition_2026_27.pdf")}
            style={{ minHeight: "48px" }}
          >
            Download Official Rulebook PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Current Rule Edition" value="Edition 2026/27" meta="Version 4.2 Approved" tone="volt" />
        <StatCard label="Scoring Scale" value="100.00 Points" meta="Olympic Trimmed Mean" />
        <StatCard label="Standard Divisions" value="5 Divisions" meta="Crew & Street Battle" tone="volt" />
        <StatCard label="Technical Penalties" value="Enforced" meta="Direct score deduction" />
      </div>

      {/* 5-CRITERIA RUBRIC */}
      <section className="panel p-6 bg-carbon border border-subtle rounded-xl space-y-4">
        <h3 className="text-xl font-bold text-chrome">Authoritative 100-Point Rubric Weights</h3>
        <p className="text-sm text-titanium">
          Judges submit scores across 5 distinct criteria. Panel scores are processed via trimmed Olympic average to mathematically eradicate statistical bias.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
          {rubric.map((r) => (
            <div key={r.name} className="p-4 bg-obsidian border border-subtle rounded-lg space-y-2">
              <div className="flex justify-between items-start">
                <span className="mono text-2xl font-black text-volt">{r.points}</span>
                <span className="text-[10px] mono text-titanium">PTS MAX</span>
              </div>
              <h4 className="font-bold text-chrome text-sm">{r.name}</h4>
              <p className="text-xs text-titanium">{r.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DIVISION MATRIX */}
      <section className="panel p-6 bg-carbon border border-subtle rounded-xl space-y-4">
        <h3 className="text-xl font-bold text-chrome">Division Boundary Parameters</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-subtle text-xs mono text-titanium">
                <th className="p-4">Division</th>
                <th className="p-4">Roster Bounds</th>
                <th className="p-4">Age Restriction</th>
                <th className="p-4">Routine Duration</th>
                <th className="p-4">Stage Boundary</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle">
              {divisions.map((d) => (
                <tr key={d.name} className="hover:bg-subtle/30 transition-colors">
                  <td className="p-4 font-bold text-chrome">{d.name}</td>
                  <td className="p-4 mono text-xs text-titanium">{d.roster}</td>
                  <td className="p-4 text-xs text-titanium">{d.age}</td>
                  <td className="p-4 mono text-xs text-volt font-bold">{d.duration}</td>
                  <td className="p-4 text-xs text-titanium">{d.stageLimits}</td>
                  <td className="p-4">
                    <Status tone="volt">{d.status}</Status>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
