import Link from "next/link";
import { Arrow, PageHeading, Status } from "@/components/ui";

const gates = [
  { title: "Seed and quota allocation", detail: "No approved eligibility, tie, correction or advancement rule set exists for this event. The product brief's roster-retention and seeding proposals are not verified policy." },
  { title: "Invitations and acceptance", detail: "No advancement invitation, qualification or acceptance record is stored. There is nothing to resend or export." },
  { title: "Finals credentials", detail: "Accreditation and delegation manifests require an approved advancement policy and an identified issuing authority before any record can be created." },
];

export default async function AdminEventAdvancementPage({
  params,
}: {
  params: Promise<{ chapterId: string; eventId: string }>;
}) {
  const { chapterId, eventId } = await params;
  return <main id="main-content" className="workspace-main">
    <PageHeading
      eyebrow={`Chapter / ${chapterId.toUpperCase()} / Events`}
      title="Advancement is not available"
      description={`No seed allocation, invitation or acceptance workflow is connected for Event ${eventId}. Advancement remains gated on approved competition policy.`}
      action={<Link href={`/admin/${encodeURIComponent(chapterId)}/events/${encodeURIComponent(eventId)}`} className="button button-outline">Event command center <Arrow /></Link>}
    />
    <section className="panel" role="status">
      <div className="panel-heading"><div><h2>Policy gate</h2><p>No advancement invitations or finals credentials can be issued from this page.</p></div><Status tone="amber">Unavailable</Status></div>
      <p>Published division results remain available through the authorized publication desk once a division is locked and published. Advancing crews to another event requires approved rules that do not yet exist.</p>
    </section>
    <section className="connected-stack" aria-label="Advancement gates">
      {gates.map(gate => <article className="panel" key={gate.title}>
        <div className="panel-heading"><div><h2>{gate.title}</h2><p>{gate.detail}</p></div><Status tone="amber">Not connected</Status></div>
      </article>)}
    </section>
  </main>;
}
