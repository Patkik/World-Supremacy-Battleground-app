import Link from "next/link";
import { Arrow, PageHeading, Status } from "@/components/ui";

export default async function EntryChangesPage({
  params,
}: {
  params: Promise<{ entryId: string }>;
}) {
  const { entryId } = await params;
  const entry = encodeURIComponent(entryId);
  return <main id="main-content" className="workspace-main">
    <PageHeading
      eyebrow="Entry / Adjustments"
      title="Entry changes are not self-service"
      description="No division change, substitution or withdrawal request workflow is connected. No request is recorded from this page."
      action={<Link href={`/app/entries/${entry}`} className="button button-outline">Back to entry <Arrow /></Link>}
    />
    <section className="panel" role="status">
      <div className="panel-heading"><div><h2>Change request gate</h2><p>This page cannot submit a division change, dancer substitution or withdrawal request.</p></div><Status tone="amber">Unavailable</Status></div>
      <p>Division changes, dancer substitutions and entry withdrawal affect eligibility, fees and event readiness, so they need an authorized review workflow that does not exist yet. Until it does, use account support to reach the chapter; a support conversation does not change your entry by itself.</p>
    </section>
    <section className="connected-stack" aria-label="Available actions">
      <article className="panel">
        <div className="panel-heading"><div><h2>Entry workspace</h2><p>Review the current saved state, roster and readiness of this entry.</p></div><Status tone="volt">Connected</Status></div>
        <Link href={`/app/entries/${entry}`} className="button button-outline">Open entry <Arrow /></Link>
      </article>
      <article className="panel">
        <div className="panel-heading"><div><h2>Account support</h2><p>Send the chapter a durable support request and follow its conversation.</p></div><Status tone="volt">Connected</Status></div>
        <Link href="/app/support" className="button button-outline">Open support <Arrow /></Link>
      </article>
    </section>
  </main>;
}
