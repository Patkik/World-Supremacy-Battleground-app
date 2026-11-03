import Link from "next/link";
import { Arrow, PageHeading, Status } from "@/components/ui";

export default async function EventCommunicationsPage({
  params,
}: {
  params: Promise<{ chapterId: string; eventId: string }>;
}) {
  const { chapterId, eventId } = await params;
  return <main id="main-content" className="workspace-main">
    <PageHeading
      eyebrow={`Chapter / ${chapterId.toUpperCase()} / Events`}
      title="Event broadcasts are not available"
      description={`No director-composed announcement or broadcast delivery is connected for Event ${eventId}.`}
      action={<Link href={`/admin/${encodeURIComponent(chapterId)}/events/${encodeURIComponent(eventId)}`} className="button button-outline">Event command center <Arrow /></Link>}
    />
    <section className="panel" role="status">
      <div className="panel-heading"><div><h2>Broadcast gate</h2><p>Event announcements cannot be sent or tracked from this page.</p></div><Status tone="amber">Unavailable</Status></div>
      <p>The notification system delivers record-linked notices for specific events such as entry reviews, stage-position changes and payment transitions. It does not compose or send custom broadcasts, and no SMS or email channel is configured.</p>
    </section>
    <section className="connected-stack" aria-label="Available communication channels">
      <article className="panel">
        <div className="panel-heading"><div><h2>Chapter support queue</h2><p>Chapter support and director roles can read and reply to member and public inquiries.</p></div><Status tone="volt">Connected</Status></div>
        <Link href={`/admin/${encodeURIComponent(chapterId)}/support`} className="button button-outline">Open support queue <Arrow /></Link>
      </article>
    </section>
  </main>;
}
