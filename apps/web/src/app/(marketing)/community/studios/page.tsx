import Link from "next/link";
import { Arrow, PageHeading } from "@/components/ui";

export default function StudiosDirectoryPage() {
  return <main id="main-content" className="section-wrap content-page">
    <PageHeading
      eyebrow="Global training and rehearsal network"
      title="Studios and training hubs"
      description="Explore WSB-affiliated spaces once verified directory records are connected."
    />
    <section className="panel" aria-labelledby="studio-directory-title">
      <span className="eyebrow">Studio directory</span>
      <h2 id="studio-directory-title">No verified studio listings are available here yet</h2>
      <p>This workspace has no connected studio records. Submit a studio hub proposal through WSB; the regional team can follow up in your private request thread.</p>
      <Link href="/community/apply?type=studio" className="button button-volt">Propose a studio hub <Arrow /></Link>
    </section>
  </main>;
}
