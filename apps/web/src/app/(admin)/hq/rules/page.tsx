import Link from "next/link";
import { Arrow, PageHeading, Status } from "@/components/ui";
import { WSB } from "@/lib/public-content";

const pendingPolicy = [
  { title: "Division eligibility and fees", detail: "Approved roster limits, age cutoffs, performance limits, fee schedule, effective dates and approval authority." },
  { title: "Scoring and deductions", detail: "Official criteria, scoring precision and rounding, deduction catalog, panel completion, tie handling and corrections." },
  { title: "BG.ONE progression", detail: "Bracket size, seeding, round construction, byes, withdrawals, disqualification and post-ballot corrections." },
  { title: "Stage order", detail: "Seeding inputs, random draw process, replacements, reorder authority and publication notifications." },
  { title: "Music compliance", detail: "Accepted formats, duration and grace values, deadline, replacement handling and readiness effect." },
  { title: "Consent and identity", detail: "Approved document types, guardian authority, waiver wording and versions, retention and reviewer roles." },
];

export default function GlobalRuleLibraryPage() {
  return <main id="main-content" className="workspace-main">
    <PageHeading
      eyebrow="Global policy / approval gates"
      title="Rules library"
      description="No approved global rules catalog is stored in WSB. The product brief and director-authored drafts are proposals until the competition authority supplies dated sources and approval roles."
      action={<Link href="/hq" className="button button-outline">HQ overview <Arrow /></Link>}
    />

    <section className="panel" role="status">
      <div className="panel-heading"><div><h2>Publishing is unavailable</h2><p>There are no approved global rule versions or chapter overrides to publish from this workspace.</p></div><Status tone="amber">Approval required</Status></div>
      <p>Do not use draft division values as registration, pricing, judging or advancement rules. Conflicting or missing sources must be resolved before an event is activated.</p>
      <a href={WSB.rules} className="text-link" target="_blank" rel="noreferrer">Open the WSB rules reference <Arrow diagonal /></a>
      <p className="fineprint">This link is a reference document only. WSB has not imported or approved a version through this system.</p>
    </section>

    <section className="connected-stack" aria-labelledby="pending-rules-heading">
      <div><p className="eyebrow">Tracked decisions</p><h2 id="pending-rules-heading">Sources and policies still required</h2><p className="text-[var(--ink-muted)]">These items are tracked as open questions. No values are asserted here.</p></div>
      {pendingPolicy.map(item => <article className="panel" key={item.title}>
        <div className="panel-heading"><div><h3>{item.title}</h3><p>{item.detail}</p></div><Status tone="amber">Awaiting source</Status></div>
      </article>)}
    </section>

    <p className="fineprint">A complete rule catalog needs source documents, version history, applicability, conflict resolution and an authorized publication workflow. None of those actions is connected here.</p>
  </main>;
}
