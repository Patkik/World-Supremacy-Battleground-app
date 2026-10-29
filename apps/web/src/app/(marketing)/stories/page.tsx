"use client";

import { useState } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status, Button, Select } from "@/components/ui";

export default function StoriesDirectoryPage() {
  const [filter, setFilter] = useState("all");

  const stories = [
    {
      slug: "afterhours-collective-manila-triumph",
      title: "The Anatomy of 88.33: How Afterhours Collective Conquered Manila",
      category: "Championship Recaps",
      date: "October 30, 2026",
      readTime: "5 min read",
      author: "WSB Editorial",
      summary:
        "Inside the 14-month rehearsal regime, the 32-count canon transition, and the discipline that earned Afterhours Collective the 2027 Philippine Seed #1.",
      featured: true,
    },
    {
      slug: "olympic-trimmed-scoring-explained",
      title: "Why WSB Uses Olympic Trimmed Mean: Behind the Scrutineer Algorithm",
      category: "Rule Updates",
      date: "October 24, 2026",
      readTime: "4 min read",
      author: "Technical Committee",
      summary:
        "How removing panel outliers protects choreographers and ensures statistical objectivity in urban dance adjudication.",
      featured: false,
    },
    {
      slug: "bg-one-street-battle-evolution",
      title: "From Western Sydney Cyphers to Stadium Lights: The Story of BG.ONE",
      category: "Global News",
      date: "October 15, 2026",
      readTime: "6 min read",
      author: "Marco Selorio",
      summary:
        "The cultural evolution of the 1v1 street dance battle format that turned improvisational b-boying and all-styles clashes into a global spectacle.",
      featured: false,
    },
    {
      slug: "young-guns-future-of-street-dance",
      title: "Next Generation Rising: Why the Young Guns Division Sets the World Standard",
      category: "Dancer Spotlight",
      date: "September 28, 2026",
      readTime: "4 min read",
      author: "Asia-Pacific Bureau",
      summary:
        "Meet the 12-to-15 year old crews whose technical synchronization and musicality rival seasoned international adult rosters.",
      featured: false,
    },
  ];

  const filtered = filter === "all" ? stories : stories.filter((s) => s.category === filter);

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeading
          eyebrow="Culture · Craft · Movement"
          title="Stories, Analysis & Competition Chronicle"
          description="In-depth features on elite choreographers, tactical rule breakdowns, championship post-mortems, and community dispatches from worldwide chapters."
        />
        <div className="flex gap-2">
          <Select
            value={filter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilter(e.target.value)}
            style={{ minHeight: "44px" }}
          >
            <option value="all">All Editorial</option>
            <option value="Championship Recaps">Championship Recaps</option>
            <option value="Rule Updates">Rule Updates</option>
            <option value="Global News">Global News</option>
            <option value="Dancer Spotlight">Dancer Spotlight</option>
          </Select>
        </div>
      </div>

      {/* FEATURED STORY */}
      {stories.find((s) => s.featured) && (
        <div className="panel p-8 bg-carbon border-2 border-volt rounded-2xl flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="badge badge-volt">FEATURED STORY</span>
              <span className="mono text-xs text-titanium">{stories[0].category} · {stories[0].readTime}</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-chrome leading-tight">
              {stories[0].title}
            </h2>
            <p className="text-titanium text-base max-w-3xl leading-relaxed">
              {stories[0].summary}
            </p>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-subtle">
            <span className="text-xs text-titanium">By {stories[0].author} · {stories[0].date}</span>
            <Link
              href={`/stories/${stories[0].slug}`}
              className="button button-volt"
              style={{ minHeight: "44px" }}
            >
              Read Full Feature <Arrow />
            </Link>
          </div>
        </div>
      )}

      {/* STORIES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filtered
          .filter((s) => !s.featured || filter !== "all")
          .map((story) => (
            <div
              key={story.slug}
              className="panel p-6 bg-carbon border border-subtle hover:border-volt transition-colors rounded-xl flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="badge badge-neutral">{story.category}</span>
                  <span className="mono text-titanium">{story.readTime}</span>
                </div>
                <h3 className="text-xl font-bold text-chrome leading-snug">{story.title}</h3>
                <p className="text-xs text-titanium leading-relaxed">{story.summary}</p>
              </div>

              <div className="pt-4 border-t border-subtle flex justify-between items-center text-xs">
                <span className="text-titanium">{story.date}</span>
                <Link href={`/stories/${story.slug}`} className="text-link">
                  Read <Arrow diagonal />
                </Link>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
