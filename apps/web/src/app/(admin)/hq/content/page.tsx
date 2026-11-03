import Link from "next/link";
import { Arrow, PageHeading, Status } from "@/components/ui";

const contentAreas = [
  { title: "Event announcements", detail: "No durable global publishing record or publication receipt is connected." },
  { title: "Rule and policy documents", detail: "Source links are reference material; approved versions and applicability are not managed here." },
  { title: "Editorial and partner features", detail: "No verified content inventory, translation workflow or publication permissions are configured." },
];

export default function GlobalContentPublishingPage() {
  return <main id="main-content" className="workspace-main">
    <PageHeading
      eyebrow="Global HQ / publishing gate"
      title="Global content"
      description="Global content publishing is not connected to a durable content service. No campaign, partner feature or announcement is represented as live from this page."
      action={<Link href="/hq" className="button button-outline">HQ overview <Arrow /></Link>}
    />
    <section className="panel" role="status">
        <div className="panel-heading"><div><h2>No connected releases</h2><p>There are no published campaigns available in this workspace.</p></div><Status tone="amber">Unavailable</Status></div>
      <p>Public pages keep only their existing, source-reviewed project content. This workspace cannot create, schedule, edit or publish global content.</p>
    </section>
    <section className="connected-stack" aria-label="Global publishing capabilities">
      {contentAreas.map(area => <article className="panel" key={area.title}>
        <div className="panel-heading"><div><h2>{area.title}</h2><p>{area.detail}</p></div><Status tone="amber">Not connected</Status></div>
      </article>)}
    </section>
  </main>;
}
