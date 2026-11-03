import Link from "next/link";
import { Arrow, PageHeading, Status } from "@/components/ui";

const gates = [
  { title: "Music upload cutoff", detail: "No event music deadline is enforced by this page. Submission deadline, late handling and replacement policy remain undecided and are not configured here." },
  { title: "Fee currency", detail: "The chapter currency comes from the chapter record. There is no per-event currency override." },
  { title: "Automatic locking", detail: "No automatic division or registration lock exists. Divisions lock only through the authorized head-judge barrier." },
];

export default async function EventSettingsPage({
  params,
}: {
  params: Promise<{ chapterId: string; eventId: string }>;
}) {
  const { chapterId, eventId } = await params;
  const chapter = encodeURIComponent(chapterId);
  return <main id="main-content" className="workspace-main">
    <PageHeading
      eyebrow={`Chapter / ${chapterId.toUpperCase()} / Events`}
      title="Event configuration"
      description={`Core event draft fields and the registration window for Event ${eventId} are edited from the chapter events list.`}
      action={<Link href={`/admin/${chapter}/events/${encodeURIComponent(eventId)}`} className="button button-outline">Event command center <Arrow /></Link>}
    />
    <section className="panel" role="status">
        <div className="panel-heading"><div><h2>Connected configuration lives elsewhere</h2><p>Use the event tools below to manage the settings currently supported here.</p></div><Status tone="volt">Partially connected</Status></div>
      <p>A chapter director edits the event name, date, timezone, venue and rules source/version reference, and the registration open/close window, with a recorded reason and revision checks. Those controls are on the chapter events list for each saved event.</p>
      <Link href={`/admin/${chapter}/events`} className="button button-volt">Open event management <Arrow /></Link>
    </section>
    <section className="connected-stack" aria-label="Unavailable event settings">
      {gates.map(gate => <article className="panel" key={gate.title}>
        <div className="panel-heading"><div><h2>{gate.title}</h2><p>{gate.detail}</p></div><Status tone="amber">Not connected</Status></div>
      </article>)}
    </section>
  </main>;
}
