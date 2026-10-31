import Link from "next/link";
import { PageHeading } from "./ui";

type Props = {
  title: string;
  description: string;
  detail: string;
  helpHref: string;
  backHref?: string;
  publicPage?: boolean;
};

export function WorkflowUnavailable({ title, description, detail, helpHref, backHref, publicPage = false }: Props) {
  return <main id="main-content" className={publicPage ? "section-wrap content-page" : "workspace-main"}>
    <PageHeading title={title} description={description} />
    <section className="panel max-w-xl" aria-labelledby="workflow-status">
      <h2 id="workflow-status">Not available yet</h2>
      <p>{detail}</p>
      <p>For questions, contact the WSB team. Do not send identity documents, passwords or payment credentials in a support message.</p>
      <div className="connected-actions">
        <Link className="button button-outline" href={helpHref}>Contact support</Link>
        {backHref && <Link className="button button-outline" href={backHref}>Back</Link>}
      </div>
    </section>
  </main>;
}
