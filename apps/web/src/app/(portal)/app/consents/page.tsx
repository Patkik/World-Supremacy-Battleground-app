"use client";

import { useState } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status } from "@/components/ui";

export default function ConsentsPage() {
  const [agreed, setAgreed] = useState(true);

  const waivers = [
    {
      id: "waiver-general-2027",
      title: "WSB 2027 General Competition Liability Waiver",
      version: "2027.1",
      signedAt: "2026-10-28",
      status: "Signed",
    },
    {
      id: "waiver-broadcast-2027",
      title: "Worldwide Media & Livestream Broadcast Release",
      version: "2027.1",
      signedAt: "2026-10-28",
      status: "Signed",
    },
  ];

  return (
    <main id="main-content" className="workspace-main">
      <PageHeading
        eyebrow="Participant Safeguards"
        title="Consent & Legal Waivers"
        description="Review all executed release forms, medical consents, and broadcast authorizations."
        action={
          <Link href="/app/dependents" className="button button-outline">
            Guardian Dependents <Arrow />
          </Link>
        }
      />

      <section className="panel roster-panel">
        <div className="panel-heading">
          <div>
            <h2>Executed Legal Agreements</h2>
            <p>Signed under active participant identity</p>
          </div>
          <span className="mono text-volt font-bold">2 Active</span>
        </div>

        <div className="roster-table">
          <div className="roster-header">
            <span>Agreement Title</span>
            <span>Version</span>
            <span>Execution Date</span>
            <span>Status</span>
          </div>
          {waivers.map((w) => (
            <div className="roster-record" key={w.id}>
              <div>
                <strong>{w.title}</strong>
                <span className="mono text-xs text-muted block">{w.id}</span>
              </div>
              <span className="mono text-sm">v{w.version}</span>
              <span className="mono text-sm text-titanium">{w.signedAt}</span>
              <Status tone="volt">{w.status}</Status>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6 p-4 rounded bg-carbon border border-subtle">
        <h3 className="font-bold text-chrome text-sm mb-1">Guardian Consent Requirement</h3>
        <p className="text-xs text-titanium leading-relaxed">
          For minor dancers (under 18), parents or court-appointed legal guardians must execute the Youth Division Consent Addendum.
          Manage minor linked accounts in the <Link href="/app/dependents" className="text-volt underline">Guardian Dependents</Link> console.
        </p>
      </div>
    </main>
  );
}