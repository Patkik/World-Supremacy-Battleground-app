"use client";

import { useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Arrow, PageHeading } from "@/components/ui";

export default function CreateEventPage({
  params,
}: {
  params: Promise<{ chapterId: string }>;
}) {
  const { chapterId } = use(params);
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [venue, setVenue] = useState("");
  const [date, setDate] = useState("");
  const [rulesVersion, setRulesVersion] = useState("2027.1");
  const [creating, setCreating] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setTimeout(() => {
      router.push(`/admin/${chapterId}/events`);
    }, 600);
  }

  return (
    <main id="main-content" className="workspace-main">
      <PageHeading
        eyebrow={`Chapter Command / ${chapterId.toUpperCase()}`}
        title="Create New Championship Event"
        description="Initialize a new regional qualifier or master session under this chapter's governance."
        action={
          <Link href={`/admin/${chapterId}/events`} className="button button-outline">
            ← Cancel
          </Link>
        }
      />

      <div className="max-w-xl">
        <section className="panel">
          <div className="panel-heading">
            <h2>Event Parameters</h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div>
              <label className="block text-sm font-semibold text-chrome mb-1">Event Title</label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
                }}
                placeholder="e.g. WSB Visayas Championship 2027"
                required
                className="w-full p-3 rounded bg-tungsten border border-subtle text-chrome focus:border-volt"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-chrome mb-1">URL Identifier / Slug</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
                className="w-full p-3 rounded bg-tungsten border border-subtle text-chrome mono text-sm focus:border-volt"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-chrome mb-1">Event Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full p-3 rounded bg-tungsten border border-subtle text-chrome focus:border-volt"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-chrome mb-1">Official Rules Version</label>
                <select
                  value={rulesVersion}
                  onChange={(e) => setRulesVersion(e.target.value)}
                  className="w-full p-3 rounded bg-tungsten border border-subtle text-chrome focus:border-volt"
                >
                  <option value="2027.1">WSB 2027.1 Official Rules</option>
                  <option value="2026.2">WSB 2026.2 Legacy Rules</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-chrome mb-1">Arena Venue & Location</label>
              <input
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="e.g. Waterfront Hotel Arena, Cebu City"
                required
                className="w-full p-3 rounded bg-tungsten border border-subtle text-chrome focus:border-volt"
              />
            </div>

            <div className="pt-2">
              <button type="submit" disabled={creating} className="button button-volt">
                {creating ? "Initializing Event..." : "Create Event & Setup Divisions"} <Arrow />
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}