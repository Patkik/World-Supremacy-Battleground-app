import Link from "next/link";
import { Arrow, PageHeading } from "@/components/ui";
import { WSB } from "@/lib/public-content";

export default async function EventRulesPage({ params }: { params: Promise<{ eventSlug: string }> }) {
  const { eventSlug } = await params;

  return <main id="main-content" className="section-wrap max-w-5xl mx-auto py-12 space-y-8">
    <Link className="back-link inline-block" href={`/events/${encodeURIComponent(eventSlug)}`}>← Back to event overview</Link>
    <PageHeading
      eyebrow="Rules and event guidance"
      title="No approved rule version is published here."
      description="This app does not have a versioned, event-approved rule set for this event. Do not rely on sample roster limits, scoring weights or deduction amounts as official requirements."
      action={<Link href={`/app/register/${encodeURIComponent(eventSlug)}`} className="button button-outline" style={{ minHeight: 56 }}>Open crew registration <Arrow diagonal /></Link>}
    />
    <section className="panel p-6 md:p-9 space-y-5" aria-labelledby="official-source-heading">
      <p className="eyebrow">External WSB source</p>
      <h2 id="official-source-heading" className="text-2xl font-bold text-chrome">Check the current source with your event organizer.</h2>
      <p className="max-w-3xl text-titanium">The linked WSB rules and championship guide are source documents, not a rule version approved and attached to this event in the app. Confirm the applicable edition, effective date and any chapter-specific requirements before entering.</p>
      <div className="flex flex-wrap gap-4">
        <a href={WSB.rules} target="_blank" rel="noreferrer" className="text-link">WSB rules document <Arrow diagonal /></a>
        <a href={WSB.championshipGuide} target="_blank" rel="noreferrer" className="text-link">Championship guide <Arrow diagonal /></a>
        <Link href={WSB.contact} className="text-link">Contact WSB <Arrow /></Link>
      </div>
    </section>
  </main>;
}
