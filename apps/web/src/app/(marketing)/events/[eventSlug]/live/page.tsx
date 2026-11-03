import Link from "next/link";
import { Arrow, PageHeading } from "@/components/ui";

export default async function SpectatorLiveHubPage({ params }: { params: Promise<{ eventSlug: string }> }) {
  const { eventSlug } = await params;
  const eventRef = encodeURIComponent(eventSlug);

  return <main id="main-content" className="section-wrap max-w-5xl mx-auto py-12 space-y-8">
    <PageHeading
      eyebrow="Event live"
      title="Video streaming is unavailable here."
      description="This page has no connected video stream. You can still view a chapter-director-published stage display and any results the event has released."
    />
    <section className="panel p-6 md:p-10 space-y-4" aria-labelledby="live-status">
      <p className="eyebrow">Event reference · {eventSlug}</p>
      <h2 id="live-status" className="text-2xl md:text-3xl font-bold text-chrome">The stage display carries current event state.</h2>
      <p className="max-w-2xl text-titanium">It shows the published stage, crew and division labels only. It is not a camera feed. Audience cheers and stream metrics are not available.</p>
      <div className="flex flex-wrap gap-3 pt-2">
        <Link href={`/arena-live/${eventRef}`} className="button button-volt" style={{ minHeight: 56 }}>Open stage display <Arrow diagonal /></Link>
        <Link href={`/events/${eventRef}/results`} className="button button-outline" style={{ minHeight: 56 }}>Published results <Arrow diagonal /></Link>
        <Link href={`/events/${eventRef}/schedule`} className="text-link">Event schedule <Arrow /></Link>
      </div>
    </section>
  </main>;
}
