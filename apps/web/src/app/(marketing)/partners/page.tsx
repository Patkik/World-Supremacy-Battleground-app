"use client";

import Link from "next/link";
import { Arrow, PageHeading, Status, Button, StatCard } from "@/components/ui";

export default function PartnersSponsorshipPage() {
  const partners = [
    {
      category: "Global Presenting Partner",
      name: "Monster Energy",
      desc: "Fueling dancers across Asia-Pacific qualifiers and powering the BG.ONE World Street Battle Clash.",
      tier: "Title Sponsor",
    },
    {
      category: "Official Technical Audio Partner",
      name: "Shure & Dante Pro Audio",
      desc: "Equipping arenas with broadcast-grade condenser microphones, concert monitors, and low-latency digital networks.",
      tier: "Official Hardware",
    },
    {
      category: "Global Travel & Host City Partner",
      name: "Destination NSW & ICC Sydney",
      desc: "Proud home of the World Supremacy Battlegrounds World Championship, hosting international delegations in Sydney.",
      tier: "Host Destination",
    },
    {
      category: "Official Footwear & Apparel",
      name: "Streetwear Syndicate",
      desc: "Custom merchandise, athlete uniforms, and exclusive championship merchandise collections.",
      tier: "Apparel Sponsor",
    },
  ];

  return (
    <div className="space-y-12 max-w-5xl mx-auto p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeading
          eyebrow="Commercial Alliances & Cultural Backing"
          title="Official Partners & Global Sponsors"
          description="World Supremacy Battlegrounds is supported by visionary brands championing youth culture, athletic excellence, and street dance artistry worldwide."
        />
        <Link href="/contact" className="button button-volt" style={{ minHeight: "48px" }}>
          Become a Partner <Arrow />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Global Audience" value="1.8M+" meta="Digital & Broadcast Reach" tone="volt" />
        <StatCard label="Live Attendees" value="45,000+" meta="Across 2026/27 Tour" />
        <StatCard label="Key Demographics" value="16–34 Yrs" meta="82% Urban Youth" tone="volt" />
        <StatCard label="Brand Activation" value="Stadium LED" meta="Custom Integrations" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {partners.map((p) => (
          <div
            key={p.name}
            className="panel p-6 bg-carbon border border-subtle hover:border-volt transition-colors rounded-xl flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <span className="badge badge-volt mono text-xs">{p.tier}</span>
              <h3 className="text-2xl font-bold text-chrome">{p.name}</h3>
              <span className="text-xs text-titanium mono block">{p.category}</span>
              <p className="text-sm text-titanium leading-relaxed">{p.desc}</p>
            </div>
            <div className="pt-4 border-t border-subtle flex justify-between items-center text-xs">
              <span className="text-titanium">Official Partner Since 2022</span>
              <span className="text-volt mono">VERIFIED BRAND</span>
            </div>
          </div>
        ))}
      </div>

      <div className="panel p-8 bg-carbon border border-subtle rounded-2xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h3 className="text-2xl font-bold text-chrome">Request Official Partnership Kit</h3>
          <p className="text-sm text-titanium mt-1">
            Download comprehensive audience demographics, broadcast metrics, arena activation packages, and rate cards.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => alert("Downloading WSB_Global_Partnership_Kit_2027.pdf")}
          style={{ minHeight: "48px" }}
        >
          Download Deck (PDF)
        </Button>
      </div>
    </div>
  );
}
