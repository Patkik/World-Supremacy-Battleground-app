import Link from "next/link";
import { Arrow, EmptyState, PageHeading } from "@/components/ui";

export default async function PublicCrewProfilePage({ params }: { params: Promise<{ crewSlug: string }> }) {
  const { crewSlug } = await params;

  return <main id="main-content" className="section-wrap max-w-5xl mx-auto py-12 space-y-8">
    <PageHeading
      eyebrow="Public crew information"
      title="Crew profiles are not published in WSB yet."
      description="Crew records and dancer rosters stay private in this app. It cannot show an approved public profile, ranking or roster for this reference."
    />
    <EmptyState title="No public crew record is available">Reference: {crewSlug}. WSB has not connected a crew-profile publishing workflow or verified public honors for this page.</EmptyState>
    <div className="flex flex-wrap gap-4"><Link href="/events" className="button button-volt" style={{ minHeight: 56 }}>Explore events <Arrow /></Link><Link href="/contact" className="text-link">Contact WSB <Arrow diagonal /></Link></div>
  </main>;
}
