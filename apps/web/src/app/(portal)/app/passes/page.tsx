"use client";

import Link from "next/link";
import { Arrow, Brand, PageHeading, Status, Button, StatCard } from "@/components/ui";

export default function PassesPortalPage() {
  const passes = [
    {
      id: "PASS-2027-014-01",
      holder: "Carlos Miguel Santos",
      role: "Competitor / Dancer",
      crew: "Afterhours Collective",
      event: "Manila Session 2027",
      venue: "SM Mall of Asia Arena",
      tier: "COMPETITOR ACCESS",
      status: "Verified & Issued",
      wristband: "Volt Green",
      code: "WSB-2027-PASS-8842",
      tone: "volt" as const,
    },
    {
      id: "PASS-2027-014-DIR",
      holder: "Marcus Vance",
      role: "Crew Director / Choreographer",
      crew: "Afterhours Collective",
      event: "Manila Session 2027",
      venue: "SM Mall of Asia Arena",
      tier: "DIRECTOR ALL-ACCESS",
      status: "Verified & Issued",
      wristband: "Gold Metallic",
      code: "WSB-2027-PASS-9011",
      tone: "volt" as const,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeading
          eyebrow="Accreditation & Door Access"
          title="Digital Venue Passes & QR Credentials"
          description="Present these digital passes at accreditation doors for backstage wristband issuance. Passes update in real time with security status."
        />
        <Button variant="secondary" onClick={() => window.print()} style={{ minHeight: "48px" }}>
          Print / Save PDF Passes
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Active Passes" value="2" meta="Afterhours Collective" tone="volt" />
        <StatCard label="Waiver Status" value="Cleared" meta="All signatures valid" />
        <StatCard label="Accreditation Gate" value="Gate 3" meta="North VIP & Backstage" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {passes.map((p) => (
          <div
            key={p.id}
            className="panel p-6 bg-carbon border border-subtle hover:border-volt transition-colors rounded-xl flex flex-col justify-between space-y-6"
          >
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <span className="badge badge-volt mono text-xs">{p.tier}</span>
                <Status tone={p.tone}>{p.status}</Status>
              </div>

              <div>
                <span className="mono text-xs text-titanium">{p.crew}</span>
                <h3 className="text-2xl font-black text-chrome">{p.holder}</h3>
                <p className="text-sm text-titanium">{p.role}</p>
              </div>

              {/* QR CODE PLACEHOLDER */}
              <div className="p-6 bg-obsidian border border-subtle rounded-xl flex flex-col items-center justify-center text-center space-y-2">
                <div className="w-32 h-32 bg-white rounded-lg p-2 flex items-center justify-center">
                  <div className="w-full h-full bg-obsidian flex items-center justify-center text-volt mono font-black text-xl">
                    [QR CODE]
                  </div>
                </div>
                <span className="mono text-xs text-titanium mt-2">{p.code}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs mono text-titanium pt-2 border-t border-subtle">
                <div>
                  <span className="block text-titanium">EVENT</span>
                  <strong className="text-chrome">{p.event}</strong>
                </div>
                <div>
                  <span className="block text-titanium">WRISTBAND</span>
                  <strong className="text-volt">{p.wristband}</strong>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-subtle flex justify-between items-center text-xs">
              <span className="text-titanium">Offline token valid for 24 hours.</span>
              <Link href="/app/consents" className="text-link">
                View Consent <Arrow diagonal />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
