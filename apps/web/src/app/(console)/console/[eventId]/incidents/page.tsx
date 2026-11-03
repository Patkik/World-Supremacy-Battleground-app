import Link from "next/link";
import { Arrow, Brand, PageHeading, Status } from "@/components/ui";

export default async function EventIncidentLogPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  return <div className="judge-shell">
    <header className="judge-header"><Brand /><div className="judge-event"><strong>Incident log</strong><span>Event {eventId}</span></div><Link href="/console" className="text-link">Console hub</Link></header>
    <main id="main-content" className="workspace-main">
      <PageHeading title="Incident logging is not available" description="No durable incident record, severity classification or owner assignment workflow is connected for this event." />
      <section className="panel" role="status">
        <div className="panel-heading"><div><h2>Incident workflow gate</h2><p>This page cannot submit or preserve an incident report.</p></div><Status tone="amber">Unavailable</Status></div>
        <p>Venue incidents affecting safety, scoring or schedules follow the organizer's own event procedures until an authorized in-system workflow with defined retention and access rules exists. Use the chapter support queue for account or registration issues.</p>
        <Link href={`/console/${encodeURIComponent(eventId)}/marshal`} className="button button-outline">Open the marshal workspace <Arrow /></Link>
      </section>
    </main>
  </div>;
}
