"use client";

import Link from "next/link";
import { Arrow, PageHeading, Status, Button, StatCard } from "@/components/ui";

export default function AboutWsbPage() {
  return (
    <div className="space-y-12 max-w-5xl mx-auto p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeading
          eyebrow="The Worldwide Movement"
          title="Born on the Concrete. Built for the Arena."
          description="Since 2004, World Supremacy Battlegrounds has stood as the premier international championship where street dancers, crews, and directors represent their world."
        />
        <Link href="/events" className="button button-volt" style={{ minHeight: "48px" }}>
          Championship Calendar <Arrow />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Founded" value="2004" meta="Sydney, Australia" />
        <StatCard label="Global Reach" value="20+ Countries" meta="Asia-Pacific & Americas" tone="volt" />
        <StatCard label="Dancers Annually" value="15,000+" meta="Youth & Professional" tone="volt" />
        <StatCard label="Championship Final" value="ICC Sydney" meta="World Stage" />
      </div>

      {/* CORE MANIFESTO */}
      <section className="panel p-8 bg-carbon border border-subtle rounded-2xl space-y-6">
        <h2 className="text-2xl font-black text-chrome">One Floor. Every Possibility.</h2>
        <div className="space-y-4 text-titanium leading-relaxed text-base">
          <p>
            World Supremacy Battlegrounds (WSB) was founded on a simple truth: street dance belongs to the dancers who live it. What began as an intimate community battle in Western Sydney has grown into the Southern Hemisphere’s largest international street dance championship and a global benchmark for competitive urban arts.
          </p>
          <p>
            From Manila to Melbourne, Tokyo to Auckland, Singapore to Johannesburg, WSB provides an uncompromised competitive platform. Every division—from the explosive precision of Open Crew and Monster Crew to the raw improvised clash of BG.ONE 1v1 Street Battles—is judged by certified pioneers on an unyielding 100-point rubric.
          </p>
          <p>
            We celebrate the discipline, the sweat in late-night studio sessions, the community bonds, and the pride of taking the world stage wearing your nation’s colors.
          </p>
        </div>
      </section>

      {/* CORE PILLARS */}
      <section className="space-y-4">
        <h2 className="text-2xl font-black text-chrome">Championship Pillars</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="panel p-6 bg-carbon border border-subtle rounded-xl space-y-3">
            <span className="badge badge-volt">INTEGRITY</span>
            <h3 className="text-xl font-bold text-white">Scrutineer-Audited Scoring</h3>
            <p className="text-sm text-titanium">
              Our 5-criteria rubric eliminates arbitrary bias through Olympic trimmed means, transparent deductions, and cryptographically verified public scorecards.
            </p>
          </div>

          <div className="panel p-6 bg-carbon border border-subtle rounded-xl space-y-3">
            <span className="badge badge-volt">COMMUNITY</span>
            <h3 className="text-xl font-bold text-white">Youth & Studio Growth</h3>
            <p className="text-sm text-titanium">
              From our Young Guns division to accredited studio networks, WSB provides clear educational and career progression paths for the next generation.
            </p>
          </div>

          <div className="panel p-6 bg-carbon border border-subtle rounded-xl space-y-3">
            <span className="badge badge-volt">STAGE</span>
            <h3 className="text-xl font-bold text-white">Stadium-Grade Production</h3>
            <p className="text-sm text-titanium">
              Every dancer deserves world-class concert audio, 4K multi-camera broadcast feeds, and arena LED displays worthy of their artistry.
            </p>
          </div>
        </div>
      </section>

      {/* CALL TO ACTION */}
      <div className="p-8 bg-gradient-to-r from-obsidian via-carbon to-obsidian border-2 border-volt rounded-2xl flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
        <div>
          <h3 className="text-3xl font-black text-white">Ready to Represent Your World?</h3>
          <p className="text-titanium text-sm mt-1">
            Register your crew, locate an upcoming regional qualifier, or apply to host a chapter.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/events" className="button button-volt" style={{ minHeight: "48px" }}>
            Find a Qualifier <Arrow />
          </Link>
          <Link href="/community/apply" className="button button-secondary" style={{ minHeight: "48px" }}>
            Apply as Chapter
          </Link>
        </div>
      </div>
    </div>
  );
}
