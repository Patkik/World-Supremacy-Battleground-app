import Link from "next/link";
import { Arrow, PageHeading, Status } from "@/components/ui";

const gates = [
  { title: "Score variance audit", detail: "No scrutineer report or judge-variance analysis is generated. Individual judge scores stay private to the authorized judging workflow; no aggregate audit statistic is computed here." },
  { title: "Attendance reconciliation", detail: "Check-in records exist only as the online check-in primitive. No gate, wristband or attendance total is recorded, so no reconciliation report can be produced." },
  { title: "Financial report export", detail: "The finance ledger is available to authorized finance and director roles in the finance workspace. No PDF/CSV report export is connected, and export and retention policy remains undecided." },
];

export default async function AdminEventReportsPage({
  params,
}: {
  params: Promise<{ chapterId: string; eventId: string }>;
}) {
  const { chapterId, eventId } = await params;
  const chapter = encodeURIComponent(chapterId);
  return <main id="main-content" className="workspace-main">
    <PageHeading
      eyebrow={`Chapter / ${chapterId.toUpperCase()} / Events`}
      title="Event reports are not available"
      description={`No scrutineer audit, attendance reconciliation or financial report is connected for Event ${eventId}.`}
      action={<Link href={`/admin/${chapter}/events/${encodeURIComponent(eventId)}`} className="button button-outline">Event command center <Arrow /></Link>}
    />
    <section className="panel" role="status">
      <div className="panel-heading"><div><h2>Report generation gate</h2><p>This page does not create or export event reports.</p></div><Status tone="amber">Unavailable</Status></div>
      <p>Authorized chapter directors and auditors can read the persisted chapter audit history, and finance roles can inspect recorded ledger entries. Those records are the only authoritative sources; this page fabricates no totals.</p>
      <ul className="connected-list">
        <li><Link href={`/admin/${chapter}/audit`} className="flex min-h-12 items-center justify-between gap-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"><span><strong>Chapter audit history</strong><span className="block">Read-only persisted audit records for directors and auditors.</span></span><span aria-hidden="true">→</span></Link></li>
        <li><Link href={`/admin/${chapter}/finance/transactions`} className="flex min-h-12 items-center justify-between gap-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"><span><strong>Finance transactions</strong><span className="block">Recorded payment ledger entries for authorized finance roles.</span></span><span aria-hidden="true">→</span></Link></li>
      </ul>
    </section>
    <section className="connected-stack" aria-label="Report gates">
      {gates.map(gate => <article className="panel" key={gate.title}>
        <div className="panel-heading"><div><h2>{gate.title}</h2><p>{gate.detail}</p></div><Status tone="amber">Not connected</Status></div>
      </article>)}
    </section>
  </main>;
}
