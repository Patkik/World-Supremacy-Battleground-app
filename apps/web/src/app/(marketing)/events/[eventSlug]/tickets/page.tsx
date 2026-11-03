import Link from "next/link";
import { PageHeading, Status } from "@/components/ui";

export default async function SpectatorTicketsPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;

  return (
    <main id="main-content" className="section-wrap py-12">
      <Link className="back-link mb-6 inline-block" href={`/events/${encodeURIComponent(eventSlug)}`}>
        ← Back to Event
      </Link>

      <PageHeading
        eyebrow="Spectator access"
        title="Ticket sales are not available here yet."
        description="This event does not have a connected ticket offer or checkout in WSB."
      />

      <section className="panel mt-8 max-w-3xl space-y-4 p-6 sm:p-8" aria-labelledby="ticket-status-heading">
        <Status tone="amber">Not on sale</Status>
        <h2 id="ticket-status-heading" className="text-xl font-bold text-chrome">No ticket purchase has been recorded</h2>
        <p className="text-titanium">
          Ticket prices, available inventory, access terms, refunds and transfers need to be
          configured for this event before sales can open. This page does not reserve admission,
          accept payment or create a ticket.
        </p>
        <p className="fineprint">Event reference: <span className="mono">{eventSlug}</span></p>
        <Link href="/contact" className="button button-outline">Ask a question about ticket availability</Link>
      </section>
    </main>
  );
}
