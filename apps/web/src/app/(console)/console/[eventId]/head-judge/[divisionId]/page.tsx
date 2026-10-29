"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Arrow, Brand, PageHeading, Status, Button } from "@/components/ui";

export default function DivisionFinalizationPage({
  params,
}: {
  params: Promise<{ eventId: string; divisionId: string }>;
}) {
  const { eventId, divisionId } = use(params);
  const [locked, setLocked] = useState(false);
  const [locking, setLocking] = useState(false);

  const entries = [
    {
      rank: 1,
      number: "014",
      crew: "Afterhours Collective",
      origin: "Manila, PH",
      j1: 88.5,
      j2: 89.0,
      j3: 87.5,
      penalty: 0.0,
      total: 88.33,
      status: "Verified",
      qualified: true,
    },
    {
      rank: 2,
      number: "015",
      crew: "Alliance Project",
      origin: "Cebu, PH",
      j1: 87.0,
      j2: 86.5,
      j3: 88.0,
      penalty: 0.0,
      total: 87.17,
      status: "Verified",
      qualified: true,
    },
    {
      rank: 3,
      number: "012",
      crew: "Legion X",
      origin: "Quezon City, PH",
      j1: 86.0,
      j2: 85.0,
      j3: 85.5,
      penalty: -0.5,
      total: 85.00,
      status: "Penalty Applied",
      qualified: true,
    },
    {
      rank: 4,
      number: "009",
      crew: "The Council",
      origin: "Davao, PH",
      j1: 83.5,
      j2: 84.0,
      j3: 84.5,
      penalty: 0.0,
      total: 84.00,
      status: "Verified",
      qualified: false,
    },
  ];

  const handleLockDivision = () => {
    setLocking(true);
    setTimeout(() => {
      setLocking(false);
      setLocked(true);
    }, 800);
  };

  return (
    <div className="judge-shell">
      <header className="judge-header">
        <Brand />
        <div className="judge-event">
          <strong>Division Finalization Desk</strong>
          <span>Event Desk #{eventId} · Division: {divisionId}</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href={`/console/${eventId}/head-judge`} className="text-link">
            Head Judge Overview <Arrow diagonal />
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <PageHeading
            eyebrow="Authoritative Certification"
            title="Division Lock & Score Approval"
            description="Review comparative judge scores, technical deductions, and tie-breakers. Executing lock makes this division immutable and eligible for public publication."
          />
          <div className="flex items-center gap-3">
            {locked ? (
              <Status tone="volt">DIVISION LOCKED & CERTIFIED</Status>
            ) : (
              <Button
                variant="primary"
                onClick={handleLockDivision}
                disabled={locking}
                style={{ minHeight: "48px" }}
              >
                {locking ? "Computing Lock Hash..." : "Lock Division & Authorize"}
              </Button>
            )}
          </div>
        </div>

        {locked && (
          <div className="panel p-4 bg-volt/10 border border-volt text-chrome rounded flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-bold text-volt">LOCK ENGAGED:</span>
              <span>Division cryptographic digest computed. Ready for administrator publication to Arena HUD and Public Results.</span>
            </div>
            <span className="mono text-xs text-titanium">DIGEST: SHA256-8A3F291E...</span>
          </div>
        )}

        <div className="panel bg-carbon border border-subtle overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-subtle text-xs mono text-titanium">
                <th className="p-4">Rank</th>
                <th className="p-4">Entry</th>
                <th className="p-4">Crew & Origin</th>
                <th className="p-4">J1 (Swift)</th>
                <th className="p-4">J2 (Stretch)</th>
                <th className="p-4">J3 (Yuki)</th>
                <th className="p-4">Deductions</th>
                <th className="p-4">Official Total</th>
                <th className="p-4">Status</th>
                <th className="p-4">World Finals</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle">
              {entries.map((entry) => (
                <tr key={entry.number} className="hover:bg-subtle/30 transition-colors">
                  <td className="p-4 mono font-bold text-lg text-volt">#{entry.rank}</td>
                  <td className="p-4 mono text-chrome">Entry {entry.number}</td>
                  <td className="p-4">
                    <strong className="block text-chrome">{entry.crew}</strong>
                    <span className="text-xs text-titanium">{entry.origin}</span>
                  </td>
                  <td className="p-4 mono text-titanium">{entry.j1.toFixed(1)}</td>
                  <td className="p-4 mono text-titanium">{entry.j2.toFixed(1)}</td>
                  <td className="p-4 mono text-titanium">{entry.j3.toFixed(1)}</td>
                  <td className="p-4 mono text-crimson font-medium">
                    {entry.penalty !== 0 ? entry.penalty.toFixed(1) : "0.0"}
                  </td>
                  <td className="p-4 mono font-bold text-lg text-white">{entry.total.toFixed(2)}</td>
                  <td className="p-4">
                    <Status tone={entry.penalty !== 0 ? "amber" : "volt"}>{entry.status}</Status>
                  </td>
                  <td className="p-4">
                    {entry.qualified ? (
                      <span className="badge badge-volt text-xs">QUALIFIED</span>
                    ) : (
                      <span className="text-xs text-titanium">Rank Outside Quota</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center text-sm text-titanium pt-4 border-t border-subtle">
          <span>Scoring protocol: 3-judge Olympic trimmed average minus technical deductions.</span>
          <Link href={`/console/${eventId}/penalties`} className="text-link">
            Review Technical Deductions <Arrow diagonal />
          </Link>
        </div>
      </main>
    </div>
  );
}
