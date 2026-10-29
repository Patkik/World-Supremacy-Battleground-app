"use client";

import { useState, use } from "react";
import Link from "next/link";
import { Arrow, PageHeading } from "@/components/ui";

export default function EventSettingsPage({
  params,
}: {
  params: Promise<{ chapterId: string; eventId: string }>;
}) {
  const { chapterId, eventId } = use(params);
  const [cutoffDate, setCutoffDate] = useState("2027-07-01");
  const [musicCutoff, setMusicCutoff] = useState("2027-07-10");
  const [currency, setCurrency] = useState("PHP");
  const [autoLock, setAutoLock] = useState(true);
  const [saved, setSaved] = useState(false);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <main id="main-content" className="workspace-main">
      <PageHeading
        eyebrow={`Event #${eventId} / Configuration`}
        title="Event Operations Configuration"
        description="Configure registration deadlines, music upload cutoff gates, and fee reconciliation policies."
        action={
          <Link href={`/admin/${chapterId}/events/${eventId}`} className="button button-outline">
            ← Command Center
          </Link>
        }
      />

      {saved && <p className="info-note" role="status">Event configuration saved successfully.</p>}

      <div className="max-w-xl">
        <section className="panel mb-8">
          <div className="panel-heading">
            <h2>Deadlines & Timing Gates</h2>
          </div>
          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div>
              <label className="block text-sm font-semibold text-chrome mb-1">
                Final Crew Registration Cutoff Date
              </label>
              <input
                type="date"
                value={cutoffDate}
                onChange={(e) => setCutoffDate(e.target.value)}
                required
                className="w-full p-3 rounded bg-tungsten border border-subtle text-chrome focus:border-volt"
              />
              <span className="text-xs text-titanium mt-1 block">
                After this date, new entries cannot be created without registrar authorization.
              </span>
            </div>

            <div>
              <label className="block text-sm font-semibold text-chrome mb-1">
                Performance Audio Upload Cutoff Date
              </label>
              <input
                type="date"
                value={musicCutoff}
                onChange={(e) => setMusicCutoff(e.target.value)}
                required
                className="w-full p-3 rounded bg-tungsten border border-subtle text-chrome focus:border-volt"
              />
              <span className="text-xs text-titanium mt-1 block">
                Music tracks submitted after this deadline trigger late audio penalty deduction flags.
              </span>
            </div>

            <div>
              <label className="block text-sm font-semibold text-chrome mb-1">
                Fee Currency Code
              </label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                required
                className="w-full p-3 rounded bg-tungsten border border-subtle text-chrome mono uppercase focus:border-volt"
              />
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoLock}
                  onChange={(e) => setAutoLock(e.target.checked)}
                  className="h-5 w-5 accent-volt cursor-pointer"
                />
                <span className="text-sm text-chrome">
                  Enforce division auto-locking upon final judge submission
                </span>
              </label>
            </div>

            <div className="pt-4">
              <button type="submit" className="button button-volt">
                Save Configuration <Arrow />
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}