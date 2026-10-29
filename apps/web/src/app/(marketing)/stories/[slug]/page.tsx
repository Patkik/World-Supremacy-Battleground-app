"use client";

import { use } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status, Button } from "@/components/ui";

export default function StoryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  const story = {
    title: "The Anatomy of 88.33: How Afterhours Collective Conquered Manila",
    category: "Championship Recaps",
    date: "October 30, 2026",
    author: "WSB Editorial Bureau",
    readTime: "5 min read",
    division: "Open Crew Division · Manila Session 2027",
  };

  return (
    <article className="space-y-8 max-w-4xl mx-auto p-6">
      <div className="space-y-4">
        <Link href="/stories" className="text-link text-xs mono">
          ← Back to All Stories
        </Link>
        <div className="flex items-center gap-3">
          <span className="badge badge-volt">{story.category}</span>
          <span className="mono text-xs text-titanium">{story.readTime} · {story.date}</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-chrome leading-tight">
          {story.title}
        </h1>
        <p className="text-xs mono text-titanium">By {story.author} · {story.division}</p>
      </div>

      <div className="p-6 bg-carbon border-l-4 border-volt rounded-r-xl text-lg text-white font-medium italic leading-relaxed">
        "When the first 8-count dropped, the energy in the arena shifted completely. Twelve dancers moved as a single organism with zero margin for error."
      </div>

      <div className="space-y-6 text-titanium leading-relaxed text-base pt-4">
        <p>
          Scoring above 88.00 on the WSB Olympic trimmed rubric is a benchmark rarely reached in regional qualifiers. To do so requires nearly flawless execution across all five core criteria: Execution & Synchronization (30 pts), Choreography & Staging (25 pts), Creativity & Originality (20 pts), Musicality (15 pts), and Stage Presence (10 pts).
        </p>

        <h2 className="text-2xl font-bold text-chrome mt-8 mb-4">
          The 32-Count Canon Ripple
        </h2>
        <p>
          Director Marcus Vance structured the routine around an escalating rhythmic polyrhythm. In the midpoint of section two, a 32-count ripple propagated through four concentric lines. Where most crews experience slight desynchronization during backward blind transitions, Afterhours maintained millimeter spatial integrity.
        </p>

        <h2 className="text-2xl font-bold text-chrome mt-8 mb-4">
          Zero Technical Deductions
        </h2>
        <p>
          Beyond creative merit, compliance discipline proved decisive. The routine clocked in at exactly 2 minutes and 28 seconds—two seconds below the rigid 2:30 ceiling. Audio loudness was mastered to -13.8 LUFS, avoiding broadcast clipping penalties, and stage clearances were executed within the 10-second buffer.
        </p>

        <h2 className="text-2xl font-bold text-chrome mt-8 mb-4">
          The Road to Sydney
        </h2>
        <p>
          With the official score certified by Head Judge Ken Swift, Afterhours Collective claims Philippine National Seed #1 and direct qualification to the World Supremacy Battlegrounds World Championship at ICC Sydney.
        </p>
      </div>

      <div className="pt-8 border-t border-subtle flex flex-col sm:flex-row justify-between items-center gap-4">
        <span className="text-xs text-titanium mono">STORY ID: {slug}</span>
        <div className="flex gap-3">
          <Link href="/rankings" className="button button-volt" style={{ minHeight: "44px" }}>
            View World Rankings <Arrow />
          </Link>
          <Link href="/results" className="button button-secondary" style={{ minHeight: "44px" }}>
            Check Manila Scorecards
          </Link>
        </div>
      </div>
    </article>
  );
}
