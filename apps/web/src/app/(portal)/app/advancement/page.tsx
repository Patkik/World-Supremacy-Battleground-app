"use client";

import { useState } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status, Button, StatCard } from "@/components/ui";

export default function AdvancementPortalPage() {
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const invite = {
    id: "INV-WORLDS-2027-014",
    crew: "Afterhours Collective",
    event: "WSB World Championship 2027",
    location: "Sydney, Australia · ICC Sydney Theatre",
    date: "October 1–4, 2027",
    division: "Open Crew Division",
    seed: "Philippine National Seed #1",
    qualificationSource: "Rank #1 Champion · Manila Session 2027 (Score: 88.33)",
    acceptanceDeadline: "December 15, 2026",
    quota: "Top 3 National Allocation",
  };

  const handleAccept = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setAccepted(true);
    }, 600);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeading
          eyebrow="Global Championship Advancement"
          title="World Finals Qualification & Seed Allocations"
          description="Congratulations. Afterhours Collective has earned official qualification to represent your nation at the WSB World Championship."
        />
        <Link href="/app/scorecards" className="text-link">
          Review Manila Scorecard <Arrow diagonal />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Invitation State" value={accepted ? "Accepted" : "Pending Action"} meta={accepted ? "Seed confirmed" : "Expires Dec 15"} tone={accepted ? "volt" : "amber"} />
        <StatCard label="Assigned Seed" value="#1 PH Seed" meta="Open Crew" tone="volt" />
        <StatCard label="Host City" value="Sydney, AU" meta="ICC Theatre" />
        <StatCard label="Delegation Travel" value="Pack Ready" meta="Visas & hotel guide" />
      </div>

      {/* INVITATION SPOTLIGHT CARD */}
      <div className="panel p-8 bg-carbon border-2 border-volt rounded-2xl space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="badge badge-volt">OFFICIAL INVITATION</span>
              <Status tone={accepted ? "volt" : "amber"}>
                {accepted ? "Confirmed Acceptance" : "Awaiting Confirmation"}
              </Status>
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-chrome">{invite.event}</h2>
            <p className="text-sm text-titanium mt-1">{invite.location} · {invite.date}</p>
          </div>

          <div className="text-right">
            <span className="text-xs mono text-titanium block">SEED TIER</span>
            <span className="mono text-2xl font-black text-volt">{invite.seed}</span>
          </div>
        </div>

        <div className="p-4 bg-obsidian border border-subtle rounded-xl grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-xs text-titanium block">Qualification Earned</span>
            <strong className="text-chrome">{invite.qualificationSource}</strong>
          </div>
          <div>
            <span className="text-xs text-titanium block">Quota Category</span>
            <strong className="text-chrome">{invite.quota}</strong>
          </div>
          <div>
            <span className="text-xs text-titanium block">Response Deadline</span>
            <strong className="text-amber mono">{invite.acceptanceDeadline}</strong>
          </div>
        </div>

        {accepted ? (
          <div className="p-6 bg-volt/10 border border-volt rounded-xl space-y-3">
            <h3 className="text-lg font-bold text-volt">
              Qualification Confirmed! Seed #1 Locked.
            </h3>
            <p className="text-sm text-titanium">
              Your crew roster allocation is preserved in the global registry. Your travel manager will receive the accreditation kit, accommodation discounts, and stage schedule directly.
            </p>
            <div className="pt-2">
              <Button variant="secondary" onClick={() => alert("Downloading WSB_Sydney_Delegation_Pack_2027.pdf")} style={{ minHeight: "44px" }}>
                Download Delegation Travel Pack (PDF)
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <Button
              variant="primary"
              onClick={handleAccept}
              disabled={loading}
              className="flex-1"
              style={{ minHeight: "52px" }}
            >
              {loading ? "Confirming Seed Allocation..." : "Confirm & Accept World Finals Invitation"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => alert("Downloading WSB_Sydney_Delegation_Pack_2027.pdf")}
              style={{ minHeight: "52px" }}
            >
              Download Travel Pack
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
