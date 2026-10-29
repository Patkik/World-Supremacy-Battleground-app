"use client";

import { useState } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status, Input, Select, StatCard } from "@/components/ui";

export default function ResultsDirectoryPage() {
  const [season, setSeason] = useState("2027");
  const [chapter, setChapter] = useState("all");
  const [query, setQuery] = useState("");

  const events = [
    {
      slug: "manila-session-2027",
      name: "Manila Session 2027",
      chapter: "Philippines",
      city: "Manila, PH",
      season: "2027",
      publishedDate: "October 30, 2026",
      divisions: ["Open Crew", "Monster Crew", "BG.ONE Street Battles"],
      topChampion: "Afterhours Collective (88.33)",
      status: "Official Published",
      tone: "volt" as const,
    },
    {
      slug: "sydney-qualifier-2026",
      name: "Sydney World Qualifier 2026",
      chapter: "Australia",
      city: "Sydney, AU",
      season: "2026",
      publishedDate: "November 14, 2025",
      divisions: ["Open Crew", "Varsity", "Young Guns"],
      topChampion: "The Brotherhood AU (89.40)",
      status: "Archived Published",
      tone: "neutral" as const,
    },
    {
      slug: "tokyo-clash-2026",
      name: "Tokyo Winter Clash 2026",
      chapter: "Japan",
      city: "Tokyo, JPN",
      season: "2026",
      publishedDate: "December 5, 2025",
      divisions: ["Monster Crew", "BG.ONE 1v1 Breaking"],
      topChampion: "Found Nation Tokyo (91.10)",
      status: "Archived Published",
      tone: "neutral" as const,
    },
  ];

  const filtered = events.filter((ev) => {
    const matchSeason = season === "all" || ev.season === season;
    const matchChapter = chapter === "all" || ev.chapter.toLowerCase() === chapter.toLowerCase();
    const matchQuery =
      ev.name.toLowerCase().includes(query.toLowerCase()) ||
      ev.topChampion.toLowerCase().includes(query.toLowerCase());
    return matchSeason && matchChapter && matchQuery;
  });

  return (
    <main id="main-content" className="section-wrap max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeading
          eyebrow="The Moments That Matter"
          title="Official Results & Scores Directory"
          description="Browse published championship podiums, cryptographic scorecards, and World Final qualification receipts across global WSB chapters."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Published Events" value={events.length.toString()} meta="Fully certified" tone="volt" />
        <StatCard label="Active Season" value="2027 Season" meta="Manila Session Live" tone="volt" />
        <StatCard label="World Quota Spots" value="18 Seeds" meta="Allocated to date" />
        <StatCard label="Verification" value="Immutable" meta="Rust Axum Ledger" />
      </div>

      {/* FILTER BAR */}
      <div className="panel p-4 bg-carbon border border-subtle grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-mono text-titanium mb-1">SEARCH BY EVENT / CREW</label>
          <Input
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
            placeholder="Search e.g. Afterhours, Manila..."
            style={{ minHeight: "44px" }}
          />
        </div>
        <div>
          <label className="block text-xs font-mono text-titanium mb-1">SEASON</label>
          <Select value={season} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSeason(e.target.value)} style={{ minHeight: "44px" }}>
            <option value="all">All Seasons</option>
            <option value="2027">2027 Season</option>
            <option value="2026">2026 Season</option>
          </Select>
        </div>
        <div>
          <label className="block text-xs font-mono text-titanium mb-1">CHAPTER / COUNTRY</label>
          <Select value={chapter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setChapter(e.target.value)} style={{ minHeight: "44px" }}>
            <option value="all">All Chapters</option>
            <option value="philippines">Philippines</option>
            <option value="australia">Australia</option>
            <option value="japan">Japan</option>
          </Select>
        </div>
      </div>

      {/* EVENTS RESULTS LIST */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-titanium border border-subtle rounded-xl">
            No published results matching your search filters. Unpublished draft events are withheld.
          </div>
        ) : (
          filtered.map((ev) => (
            <div
              key={ev.slug}
              className="panel p-6 bg-carbon border border-subtle hover:border-volt transition-colors rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="mono text-xs text-titanium">{ev.chapter} · {ev.city}</span>
                  <Status tone={ev.tone}>{ev.status}</Status>
                  <span className="text-xs text-titanium">Published {ev.publishedDate}</span>
                </div>
                <h3 className="text-2xl font-black text-chrome">{ev.name}</h3>
                <p className="text-sm text-titanium">
                  Champion: <strong className="text-volt">{ev.topChampion}</strong> · Divisions: {ev.divisions.join(", ")}
                </p>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <Link
                  href={`/events/${ev.slug}/results`}
                  className="button button-volt w-full md:w-auto"
                  style={{ minHeight: "48px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                >
                  View Official Results <Arrow />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
