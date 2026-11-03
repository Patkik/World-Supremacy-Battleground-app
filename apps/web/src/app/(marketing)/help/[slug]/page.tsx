import Link from "next/link";
import { PageHeading } from "@/components/ui";

export default async function HelpArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const title = slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  return <main id="main-content" className="section-wrap py-12"><Link className="back-link mb-6 inline-block" href="/help">← Help Center</Link><PageHeading title={title} description="Help with your WSB event" /><section className="panel max-w-3xl mt-8"><h2>Guidance is being prepared</h2><p>Event requirements and official rules are not published in this article yet. Contact the WSB team for help with your event.</p><Link className="button button-outline" href="/contact">Contact WSB</Link></section></main>;
}
