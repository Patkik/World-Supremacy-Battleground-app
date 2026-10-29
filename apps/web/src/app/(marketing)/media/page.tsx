"use client";

import Link from "next/link";
import { Arrow, PageHeading, Status, Button, StatCard } from "@/components/ui";

export default function MediaHubPage() {
  const releases = [
    {
      title: "World Supremacy Battlegrounds Confirms 2027 World Finals at ICC Sydney",
      date: "October 30, 2026",
      tag: "Championship Announcement",
      summary: "Over 2,000 international street dancers from 20 nations to convene in Sydney for the Southern Hemisphere's largest urban dance clash.",
    },
    {
      title: "Afterhours Collective Wins Manila Session 2027 with Record 88.33 Score",
      date: "October 29, 2026",
      tag: "Competition Outcome",
      summary: "Philippine National Seed #1 secured under Olympic-trimmed adjudication in front of a sold-out Mall of Asia Arena crowd.",
    },
    {
      title: "WSB Introduces Real-Time Scrutineer Outlier Detection Algorithm",
      date: "September 12, 2026",
      tag: "Technology & Rules",
      summary: "New digital judging console provides automated panel variance monitoring to ensure mathematical integrity across all qualifier heats.",
    },
  ];

  return (
    <div className="space-y-12 max-w-5xl mx-auto p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeading
          eyebrow="Press, Broadcast & Creator Center"
          title="Official Media Hub & Press Office"
          description="Access certified press announcements, vector brand logos, editorial photography packages, and apply for arena media credentials."
        />
        <Link href="/contact" className="button button-volt" style={{ minHeight: "48px" }}>
          Media Accreditation <Arrow />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Press Inquiries" value="24h SLA" meta="Global Media Desk" tone="volt" />
        <StatCard label="Brand Kit" value="Vector SVG" meta="Full logo variations" />
        <StatCard label="Editorial Photos" value="4K UHD" meta="Royalty-free press use" tone="volt" />
        <StatCard label="Broadcast Clips" value="1080p 60" meta="Broadcast highlights" />
      </div>

      {/* BRAND ASSET DOWNLOADS */}
      <section className="panel p-6 bg-carbon border border-subtle rounded-xl space-y-4">
        <h3 className="text-xl font-bold text-chrome">Official Brand Assets</h3>
        <p className="text-sm text-titanium">
          Approved vector marks and typographic lockups for accredited journalists, broadcasters, and event partners.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 bg-obsidian border border-subtle rounded-lg flex flex-col justify-between space-y-3">
            <div>
              <strong className="block text-chrome">White Brandmark SVG</strong>
              <span className="text-xs text-titanium">For dark auditorium backgrounds</span>
            </div>
            <button
              onClick={() => alert("Downloading WSB_Logo_White.svg")}
              className="button button-secondary text-xs"
              style={{ minHeight: "40px" }}
            >
              Download SVG
            </button>
          </div>

          <div className="p-4 bg-obsidian border border-subtle rounded-lg flex flex-col justify-between space-y-3">
            <div>
              <strong className="block text-chrome">World Crest Emblem</strong>
              <span className="text-xs text-titanium">Gold World Championship badge</span>
            </div>
            <button
              onClick={() => alert("Downloading WSB_World_Crest.png")}
              className="button button-secondary text-xs"
              style={{ minHeight: "40px" }}
            >
              Download PNG
            </button>
          </div>

          <div className="p-4 bg-obsidian border border-subtle rounded-lg flex flex-col justify-between space-y-3">
            <div>
              <strong className="block text-chrome">Brand Identity Guidelines</strong>
              <span className="text-xs text-titanium">Colors, typography, clearspace</span>
            </div>
            <button
              onClick={() => alert("Downloading WSB_Brand_Guidelines_2027.pdf")}
              className="button button-secondary text-xs"
              style={{ minHeight: "40px" }}
            >
              Download PDF
            </button>
          </div>
        </div>
      </section>

      {/* PRESS RELEASES */}
      <section className="space-y-4">
        <h3 className="text-xl font-bold text-chrome">Official Press Releases</h3>
        <div className="space-y-3">
          {releases.map((rel, idx) => (
            <div key={idx} className="panel p-6 bg-carbon border border-subtle rounded-xl space-y-2">
              <div className="flex items-center gap-3">
                <span className="badge badge-volt text-xs">{rel.tag}</span>
                <span className="mono text-xs text-titanium">{rel.date}</span>
              </div>
              <h4 className="text-xl font-bold text-chrome">{rel.title}</h4>
              <p className="text-sm text-titanium leading-relaxed">{rel.summary}</p>
              <div className="pt-2">
                <button
                  onClick={() => alert(`Opening press release: ${rel.title}`)}
                  className="button button-ghost text-xs"
                >
                  Read Release Statement →
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
