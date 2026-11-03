import Link from "next/link";
import { PageHeading } from "@/components/ui";

export default async function PolicyDocumentPage({ params }: { params: Promise<{ policySlug: string }> }) {
  const { policySlug } = await params;
  const title = policySlug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  return <main id="main-content" className="section-wrap py-12"><Link className="back-link mb-6 inline-block" href="/">← Back to WSB Home</Link><PageHeading title={title} description="Competition and participant policy" /><section className="panel max-w-3xl mt-8"><h2>Policy not published here yet</h2><p>Approved policy text and its effective version are not available in this system yet. Contact the WSB team for the applicable event policy.</p><Link className="button button-outline" href="/contact">Contact WSB</Link></section></main>;
}
