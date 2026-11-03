import Link from "next/link";
import { Arrow, PageHeading, Status } from "@/components/ui";

export default async function EventFeesPage({
  params,
}: {
  params: Promise<{ chapterId: string; eventId: string }>;
}) {
  const { chapterId, eventId } = await params;
  const base = `/admin/${encodeURIComponent(chapterId)}/events/${encodeURIComponent(eventId)}`;
  return <main id="main-content" className="workspace-main">
    <PageHeading
      eyebrow={`Chapter / ${chapterId.toUpperCase()} / Events`}
      title="Division entry fees"
      description={`Fee rates for Event ${eventId} come from each division's saved policy draft. They are director-authored draft values, not sanctioned rates.`}
      action={<Link href={base} className="button button-outline">Event command center <Arrow /></Link>}
    />
    <section className="panel" role="status">
      <div className="panel-heading"><div><h2>Draft policy values</h2><p>No fee schedule is official until an approved policy is attached to the event.</p></div><Status tone="amber">Draft only</Status></div>
      <p>Each division's current policy draft carries an entry fee in the chapter currency's integer minor units. Quote generation applies that saved draft rate per registered dancer on the entry. Editing a draft does not change reservations already created from earlier quotes.</p>
    </section>
    <section className="connected-stack" aria-label="Fee management">
      <article className="panel">
        <div className="panel-heading"><div><h2>Division policy drafts</h2><p>Review and revise per-division fee, roster, duration and rules-reference drafts with a recorded reason.</p></div><Status tone="volt">Connected</Status></div>
        <Link href={`${base}/division-policies`} className="button button-outline">Open division policies <Arrow /></Link>
      </article>
      <article className="panel">
        <div className="panel-heading"><div><h2>Finance transactions</h2><p>Recorded payment ledger entries for this chapter, limited to authorized finance and director roles.</p></div><Status tone="volt">Connected</Status></div>
        <Link href={`/admin/${encodeURIComponent(chapterId)}/finance/transactions`} className="button button-outline">Open finance transactions <Arrow /></Link>
      </article>
    </section>
  </main>;
}
