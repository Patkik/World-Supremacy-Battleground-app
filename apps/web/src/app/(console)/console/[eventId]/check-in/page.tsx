"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Arrow, Brand, PageHeading, Status, Button, Input, StatCard } from "@/components/ui";

export default function CheckInScannerPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);

  const [scanQuery, setScanQuery] = useState("");
  const [activeDancer, setActiveDancer] = useState<{
    id: string;
    passCode: string;
    name: string;
    stageName: string;
    crew: string;
    division: string;
    tier: string;
    waiverSigned: boolean;
    minorConsent: boolean;
    checkedIn: boolean;
    wristbandColor: string;
  } | null>({
    id: "dancer-ph-014-01",
    passCode: "WSB-2027-PASS-8842",
    name: "Carlos Miguel Santos",
    stageName: "B-Boy Spinx",
    crew: "Afterhours Collective",
    division: "Open Crew",
    tier: "Competitor Pass",
    waiverSigned: true,
    minorConsent: true,
    checkedIn: false,
    wristbandColor: "Volt Green",
  });

  const [checkedInCount, setCheckedInCount] = useState(412);
  const totalCount = 520;
  const [successMsg, setSuccessMsg] = useState("");

  const handleSimulateScan = () => {
    setActiveDancer({
      id: "dancer-ph-015-04",
      passCode: "WSB-2027-PASS-9102",
      name: "Andrea Nicole Reyes",
      stageName: "Drea",
      crew: "Alliance Project",
      division: "Open Crew",
      tier: "Crew Leader / Director",
      waiverSigned: true,
      minorConsent: true,
      checkedIn: false,
      wristbandColor: "Gold Metallic",
    });
    setSuccessMsg("");
  };

  const handleConfirmCheckIn = () => {
    if (!activeDancer) return;
    setActiveDancer({ ...activeDancer, checkedIn: true });
    setCheckedInCount((c) => c + 1);
    setSuccessMsg(`Wristband ${activeDancer.wristbandColor} issued to ${activeDancer.name} (${activeDancer.crew})`);
  };

  return (
    <div className="judge-shell">
      <header className="judge-header">
        <Brand />
        <div className="judge-event">
          <strong>Accreditation & Check-in Desk</strong>
          <span>Event Desk #{eventId} · Backstage Access Point</span>
        </div>
        <Link href="/console" className="text-link">
          Console Hub <Arrow diagonal />
        </Link>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <PageHeading
            eyebrow="Security & Venue Gate"
            title="Dancer Check-in & Pass Scanner"
            description="Scan participant QR passes, verify liability consent and identity documentation, and issue color-coded competition wristbands."
          />
          <Button
            variant="secondary"
            onClick={handleSimulateScan}
            style={{ minHeight: "48px" }}
          >
            Simulate QR Camera Scan
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="Checked In" value={`${checkedInCount} / ${totalCount}`} meta={`${Math.round((checkedInCount / totalCount) * 100)}% present`} tone="volt" />
          <StatCard label="Outstanding" value={`${totalCount - checkedInCount}`} meta="Pending arrival" tone="amber" />
          <StatCard label="Waivers Verified" value="100%" meta="Digital signatures on file" />
          <StatCard label="Scanner Latency" value="14ms" meta="Local cache hot" />
        </div>

        {successMsg && (
          <div className="panel p-4 bg-volt/10 border border-volt text-chrome rounded flex items-center justify-between">
            <span className="font-bold text-volt">{successMsg}</span>
            <span className="mono text-xs text-titanium">CONFIRMED_AT_{new Date().toLocaleTimeString()}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* SCANNER CONTROLLER */}
          <section className="panel p-6 bg-carbon border border-subtle space-y-6">
            <h2 className="text-xl font-bold text-chrome">Scanner Camera & Lookup</h2>
            <div className="p-8 bg-obsidian border-2 border-dashed border-subtle rounded-xl text-center space-y-4">
              <div className="w-20 h-20 mx-auto rounded-xl bg-subtle/30 flex items-center justify-center text-volt mono text-2xl font-bold">
                [QR]
              </div>
              <div>
                <p className="text-chrome font-bold">Optical Camera Active</p>
                <p className="text-xs text-titanium">Align dancer mobile pass within viewfinder</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm text-titanium font-medium">Or Manual Pass Code Lookup</label>
              <div className="flex gap-2">
                <Input
                  value={scanQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setScanQuery(e.target.value)}
                  placeholder="e.g. WSB-2027-PASS-8842"
                  style={{ minHeight: "48px" }}
                />
                <Button variant="secondary" onClick={handleSimulateScan} style={{ minHeight: "48px" }}>
                  Find
                </Button>
              </div>
            </div>
          </section>

          {/* DANCER VERIFICATION CARD */}
          <section className="panel p-6 bg-carbon border border-subtle space-y-6">
            <h2 className="text-xl font-bold text-chrome">Participant Verification</h2>
            {activeDancer ? (
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="mono text-xs text-volt">{activeDancer.passCode}</span>
                    <h3 className="text-2xl font-extrabold text-chrome">{activeDancer.name}</h3>
                    <p className="text-sm text-titanium font-bold">
                      Stage: <span className="text-white">{activeDancer.stageName}</span> · {activeDancer.crew}
                    </p>
                  </div>
                  <span className="badge badge-volt">{activeDancer.tier}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-subtle text-sm">
                  <div>
                    <span className="text-xs text-titanium block">Division</span>
                    <strong className="text-chrome">{activeDancer.division}</strong>
                  </div>
                  <div>
                    <span className="text-xs text-titanium block">Wristband Required</span>
                    <strong className="text-volt">{activeDancer.wristbandColor}</strong>
                  </div>
                  <div>
                    <span className="text-xs text-titanium block">Liability Waiver</span>
                    <Status tone="volt">Signed & Verified</Status>
                  </div>
                  <div>
                    <span className="text-xs text-titanium block">Minor Consent</span>
                    <Status tone="volt">Approved</Status>
                  </div>
                </div>

                <div className="pt-4 border-t border-subtle">
                  {activeDancer.checkedIn ? (
                    <div className="p-4 bg-volt/10 border border-volt text-volt text-center rounded font-bold">
                      PASSPORT CHECKED IN · WRISTBAND ATTACHED
                    </div>
                  ) : (
                    <Button
                      variant="primary"
                      onClick={handleConfirmCheckIn}
                      className="w-full"
                      style={{ minHeight: "52px" }}
                    >
                      Authorize Pass & Attach Wristband
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-titanium text-sm">Scan a pass to view accreditation details.</p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
