import Link from "next/link";
import { Arrow, Brand, PageHeading, Status } from "@/components/ui";

export default async function TechnicalDeductionsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  return <div className="judge-shell">
    <header className="judge-header"><Brand /><div className="judge-event"><strong>Technical deductions</strong><span>Event {eventId}</span></div><Link href="/console" className="text-link">Console hub</Link></header>
    <main id="main-content" className="workspace-main">
      <PageHeading title="Technical deductions" description="Technical deductions are recorded by the assigned head judge per division and entry, with revision checks and audit. There is no separate penalty desk." />
      <section className="panel" role="status">
        <div className="panel-heading"><div><h2>Deduction policy gate</h2><p>No approved deduction catalog or violation penalties are configured for this event.</p></div><Status tone="amber">Policy pending</Status></div>
        <p>Deductions entered in the head-judge division review are recorded as entered and applied once after panel averaging. They are not validated against an official catalog until one is approved.</p>
        <Link href={`/console/${encodeURIComponent(eventId)}/head-judge`} className="button button-volt">Open the head-judge division review <Arrow /></Link>
      </section>
    </main>
  </div>;
}
