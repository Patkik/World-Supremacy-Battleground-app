import Link from "next/link";
import { Arrow, PageHeading } from "@/components/ui";

export default function PartnersSponsorshipPage() {
  return <main id="main-content" className="section-wrap content-page partner-page">
    <section className="partner-intro">
      <PageHeading
        eyebrow="Commercial and community partnerships"
        title="Build the next stage with WSB"
        description="Send a partnership proposal to a regional WSB team and follow up inside this system."
      />
      <Link href="/community/apply?type=partner" className="button button-volt">Send a partnership proposal <Arrow /></Link>
    </section>
    <section className="panel partner-directory" aria-labelledby="partner-directory-title">
      <span className="eyebrow">Partner directory</span>
      <h2 id="partner-directory-title">Verified listings will appear here</h2>
      <p>This workspace has no connected, verified partner records or official media kit. No partner approval or audience claim is made on this page.</p>
      <Link href="/community/apply?type=partner" className="text-link">Start a proposal conversation <Arrow /></Link>
    </section>
  </main>;
}
