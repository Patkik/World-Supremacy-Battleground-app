import Link from "next/link";
import { Arrow, PageHeading, Status } from "@/components/ui";

export default async function DynamicEventPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;

  return (
    <main id="main-content" className="section-wrap py-12">
      <PageHeading
        eyebrow="Event directory"
        title="This event does not have a public WSB page."
        description="Event details appear here only when an organizer has published them."
      />

      <section className="panel mt-8 max-w-3xl space-y-4 p-6 sm:p-8" aria-labelledby="event-unavailable-heading">
        <Status tone="amber">Not published</Status>
        <h2 id="event-unavailable-heading" className="text-xl font-bold text-chrome">No event details are available</h2>
        <p className="text-titanium">
          This reference does not have a published event page. Dates, venue, divisions, fees,
          eligibility and registration availability are not confirmed here, and no event entry
          is created by opening this page.
        </p>
        <p className="fineprint">Event reference: <span className="mono">{eventSlug}</span></p>
        <div className="flex flex-wrap gap-3">
          <Link href="/events" className="button button-volt">View event information <Arrow /></Link>
          <a href="https://worldsupremacybattlegrounds.com/events/" className="button button-outline" target="_blank" rel="noreferrer">
            Official WSB event calendar <Arrow diagonal />
          </a>
        </div>
      </section>
    </main>
  );
}
