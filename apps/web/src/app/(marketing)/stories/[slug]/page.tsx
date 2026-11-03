import Link from "next/link";
import { PageHeading } from "@/components/ui";
export default async function StoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const title = slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  return <main id="main-content" className="section-wrap"><PageHeading title={title} description="WSB stories" /><section className="panel max-w-3xl"><h2>Story not published here</h2><p>This article is not available in the system.</p><Link className="text-link" href="/stories">All stories</Link></section></main>;
}
