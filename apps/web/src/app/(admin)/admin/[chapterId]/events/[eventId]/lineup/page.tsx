"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status, Button, StatCard } from "@/components/ui";

export default function AdminEventLineupPage({
  params,
}: {
  params: Promise<{ chapterId: string; eventId: string }>;
}) {
  const { chapterId, eventId } = use(params);

  const [lineupLocked, setLineupLocked] = useState(false);

  const [entries, setEntries] = useState([
    {
      order: 1,
      number: "011",
      crew: "Urban Pulse",
      division: "Open Crew",
      duration: "2:24",
      stageTime: "14:30 PHT",
      musicStatus: "Ready",
      rosterCount: 14,
    },
    {
      order: 2,
      number: "012",
      crew: "Legion X",
      division: "Open Crew",
      duration: "2:25",
      stageTime: "14:37 PHT",
      musicStatus: "Ready",
      rosterCount: 10,
    },
    {
      order: 3,
      number: "014",
      crew: "Afterhours Collective",
      division: "Open Crew",
      duration: "2:28",
      stageTime: "14:45 PHT",
      musicStatus: "Ready",
      rosterCount: 12,
    },
    {
      order: 4,
      number: "015",
      crew: "Alliance Project",
      division: "Open Crew",
      duration: "2:29",
      stageTime: "14:52 PHT",
      musicStatus: "Ready",
      rosterCount: 15,
    },
  ]);

  const moveUp = (index: number) => {
    if (index === 0 || lineupLocked) return;
    const newEntries = [...entries];
    const temp = newEntries[index];
    newEntries[index] = newEntries[index - 1];
    newEntries[index - 1] = temp;
    // update order numbers
    newEntries.forEach((e, idx) => {
      e.order = idx + 1;
    });
    setEntries(newEntries);
  };

  const moveDown = (index: number) => {
    if (index === entries.length - 1 || lineupLocked) return;
    const newEntries = [...entries];
    const temp = newEntries[index];
    newEntries[index] = newEntries[index + 1];
    newEntries[index + 1] = temp;
    newEntries.forEach((e, idx) => {
      e.order = idx + 1;
    });
    setEntries(newEntries);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeading
          eyebrow={`Chapter / ${chapterId.toUpperCase()} / Events`}
          title="Performance Order & Stage Schedule"
          description={`Sequence performance lineup for Event #${eventId}, allocate buffer times, and sync to judge desks and Arena LED displays.`}
        />
        <div className="flex gap-2">
          <Button
            variant={lineupLocked ? "secondary" : "primary"}
            onClick={() => setLineupLocked(!lineupLocked)}
            style={{ minHeight: "48px" }}
          >
            {lineupLocked ? "Unlock Lineup (Admin Override)" : "Lock Performance Order"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total Lineup" value={`${entries.length} Crews`} meta="Open Crew Division" />
        <StatCard label="Status" value={lineupLocked ? "Locked" : "Drafting"} meta={lineupLocked ? "Synced to Desks" : "Reorder permitted"} tone={lineupLocked ? "volt" : "amber"} />
        <StatCard label="Est. Division Run" value="45 Mins" meta="Incl. buffer intervals" />
        <StatCard label="Music Verified" value="100%" meta="All audio approved" tone="volt" />
      </div>

      <div className="panel bg-carbon border border-subtle overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-subtle text-xs mono text-titanium">
              <th className="p-4">Order</th>
              <th className="p-4">Entry #</th>
              <th className="p-4">Crew</th>
              <th className="p-4">Division</th>
              <th className="p-4">Stage Time</th>
              <th className="p-4">Track Length</th>
              <th className="p-4">Roster</th>
              <th className="p-4">Music</th>
              <th className="p-4 text-right">Adjust</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-subtle">
            {entries.map((entry, idx) => (
              <tr key={entry.number} className="hover:bg-subtle/30 transition-colors">
                <td className="p-4 mono font-bold text-volt">#{entry.order}</td>
                <td className="p-4 mono text-white">Entry {entry.number}</td>
                <td className="p-4 font-bold text-chrome">{entry.crew}</td>
                <td className="p-4 text-xs text-titanium">{entry.division}</td>
                <td className="p-4 mono text-xs text-titanium">{entry.stageTime}</td>
                <td className="p-4 mono text-xs text-titanium">{entry.duration}</td>
                <td className="p-4 mono text-xs text-titanium">{entry.rosterCount} dancers</td>
                <td className="p-4">
                  <Status tone="volt">{entry.musicStatus}</Status>
                </td>
                <td className="p-4 text-right">
                  {!lineupLocked && (
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => moveUp(idx)}
                        disabled={idx === 0}
                        className="button button-ghost text-xs p-1 px-2"
                        title="Move Up"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => moveDown(idx)}
                        disabled={idx === entries.length - 1}
                        className="button button-ghost text-xs p-1 px-2"
                        title="Move Down"
                      >
                        ▼
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center text-xs text-titanium pt-2 border-t border-subtle">
        <span>Performance orders are synchronized across Marshal, DJ, and Judge desks upon lock.</span>
        <Link href={`/admin/${chapterId}/events/${eventId}/music`} className="text-link">
          Inspect Music Files <Arrow diagonal />
        </Link>
      </div>
    </div>
  );
}
