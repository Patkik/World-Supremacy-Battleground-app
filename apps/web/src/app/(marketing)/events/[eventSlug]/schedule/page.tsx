import Link from "next/link";
import { Arrow, PageHeading } from "@/components/ui";

export default async function PublicEventSchedulePage({ params }: { params: Promise<{ eventSlug: string }> }) {
  const { eventSlug } = await params;
  const eventRef = encodeURIComponent(eventSlug);

  return <main id="main-content" className="section-wrap max-w-5xl mx-auto py-12 space-y-8">
    <PageHeading
      eyebrow="Event schedule"
      title="No public timetable is available."
      description="WSB does not have an organizer-published timetable for this event yet. Times, divisions and running order will appear here when an authorized schedule is available."
    />
    <section className="panel p-6 md:p-10 space-y-4" aria-labelledby="schedule-status">
      <p className="eyebrow">Event reference · {eventSlug}</p>
      <h2 id="schedule-status" className="text-2xl md:text-3xl font-bold text-chrome">Check the current stage or published results.</h2>
      <p className="max-w-2xl text-titanium">The arena display shows only stage information a chapter director has published. It does not imply a video stream, timetable or next-up order.</p>
      <div className="flex flex-wrap gap-3 pt-2">
        <Link href={`/arena-live/${eventRef}`} className="button button-volt" style={{ minHeight: 56 }}>Current stage display <Arrow diagonal /></Link>
        <Link href={`/events/${eventRef}/results`} className="button button-outline" style={{ minHeight: 56 }}>Published results <Arrow diagonal /></Link>
      </div>
    </section>
  </main>;
}
