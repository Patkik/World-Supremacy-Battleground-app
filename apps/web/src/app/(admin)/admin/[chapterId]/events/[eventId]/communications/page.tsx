"use client";

import { useState, use } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status } from "@/components/ui";

export default function EventCommunicationsPage({
  params,
}: {
  params: Promise<{ chapterId: string; eventId: string }>;
}) {
  const { chapterId, eventId } = use(params);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [targetGroup, setTargetGroup] = useState("all_crews");
  const [dispatched, setDispatched] = useState(false);

  function handleDispatch(e: React.FormEvent) {
    e.preventDefault();
    setDispatched(true);
  }

  return (
    <main id="main-content" className="workspace-main">
      <PageHeading
        eyebrow={`Event #${eventId} / Broadcast`}
        title="Event Communications & Announcements"
        description="Transmit high-priority schedule notices and technical stage alerts to crew managers."
        action={
          <Link href={`/admin/${chapterId}/events/${eventId}`} className="button button-outline">
            ← Command Center
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <section className="panel col-span-2">
          <div className="panel-heading">
            <h2>{dispatched ? "Broadcast Dispatched" : "Transmit Manager Announcement"}</h2>
          </div>

          {dispatched ? (
            <div className="p-6 text-center space-y-4">
              <span className="text-4xl text-volt block">✓</span>
              <h3 className="text-xl font-bold text-chrome">Announcement Broadcasted</h3>
              <p className="text-sm text-titanium max-w-md mx-auto">
                Dispatched to all 14 registered crew managers via in-app notification center and emergency SMS alert channels.
              </p>
              <button
                onClick={() => {
                  setDispatched(false);
                  setSubject("");
                  setMessage("");
                }}
                className="button button-volt"
              >
                Send Another Alert
              </button>
            </div>
          ) : (
            <form onSubmit={handleDispatch} className="space-y-4 pt-2">
              <div>
                <label className="block text-sm font-semibold text-chrome mb-1">Target Audience</label>
                <select
                  value={targetGroup}
                  onChange={(e) => setTargetGroup(e.target.value)}
                  className="w-full p-3 rounded bg-tungsten border border-subtle text-chrome focus:border-volt"
                >
                  <option value="all_crews">All Registered Crew Managers (14 Crews)</option>
                  <option value="open_crew">Open Crew Division Managers Only</option>
                  <option value="monster_crew">Monster Crew Division Managers Only</option>
                  <option value="varsity">Varsity Divisions Only</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-chrome mb-1">Subject Header</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Stage Rehearsal Call Shifted to 10:15 AM"
                  required
                  className="w-full p-3 rounded bg-tungsten border border-subtle text-chrome focus:border-volt"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-chrome mb-1">Broadcast Content</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  required
                  placeholder="Enter official stage instructions..."
                  className="w-full p-3 rounded bg-tungsten border border-subtle text-chrome focus:border-volt"
                />
              </div>

              <button type="submit" className="button button-volt">
                Dispatch Broadcast Alert <Arrow />
              </button>
            </form>
          )}
        </section>

        <aside className="panel space-y-4">
          <div className="panel-heading">
            <h2>Recent Transmissions</h2>
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-tungsten rounded border border-subtle">
              <span className="text-xs text-volt font-bold block mb-1">July 10, 2027</span>
              <strong className="text-xs text-chrome block">Final Music Cutoff Reminder</strong>
              <p className="text-xs text-titanium mt-1">Sent to all approved crew managers.</p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}