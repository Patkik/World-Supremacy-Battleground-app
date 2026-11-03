import Link from "next/link";
import { Arrow, EmptyState, PageHeading } from "@/components/ui";
import { WSB } from "@/lib/public-content";

export default async function ChapterHomePage({ params }: { params: Promise<{ chapterSlug: string }> }) {
  const { chapterSlug } = await params;

  return <main id="main-content" className="section-wrap max-w-5xl mx-auto py-12 space-y-8">
    <PageHeading
      eyebrow="Chapter information"
      title="No public chapter profile is available."
      description="This app has no approved public chapter directory or affiliation record for the requested reference."
    />
    <EmptyState title="Chapter details have not been published">Reference: {chapterSlug}. This page does not verify a chapter's status, officers, contact details, currency or events.</EmptyState>
    <div className="flex flex-wrap gap-4">
      <a href={WSB.countries} target="_blank" rel="noreferrer" className="text-link">Check WSB’s country directory <Arrow diagonal /></a>
      <Link href="/contact" className="button button-outline" style={{ minHeight: 56 }}>Contact WSB <Arrow diagonal /></Link>
    </div>
  </main>;
}
