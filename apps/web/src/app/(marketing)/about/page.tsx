import Link from "next/link";
import type { Metadata } from "next";
import { Arrow, PageHeading } from "@/components/ui";
import { WSB } from "@/lib/public-content";

export const metadata: Metadata = { title: "About WSB", description: "Learn about World Supremacy Battlegrounds, an international street dance competition and community platform.", alternates: { canonical: "/about" } };

export default function AboutWsbPage() {
  return <main id="main-content" className="section-wrap max-w-6xl mx-auto py-12 space-y-10">
    <PageHeading
      eyebrow="About World Supremacy Battlegrounds"
      title="Street dance brings us together."
      description="WSB is an international street dance competition and community platform. Event details and competition rules are published separately by their organizers."
      action={<Link href="/events" className="button button-volt" style={{ minHeight: 56 }}>Explore events <Arrow /></Link>}
    />

    <section className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]" aria-label="WSB background">
      <article className="panel p-7 md:p-10 space-y-5">
        <p className="eyebrow">A community with history</p>
        <h2 className="text-3xl font-black text-chrome">Built around the floor, the dancers and their communities.</h2>
        <p className="max-w-2xl text-titanium leading-relaxed">WSB’s official community page says the Battlegrounds Championship launched in Melbourne in July 2004. Read WSB’s current background and announcements for the latest organization information.</p>
        <a href={WSB.community} target="_blank" rel="noreferrer" className="text-link">Read WSB’s community background <Arrow diagonal /></a>
      </article>
      <article className="panel p-7 md:p-10 space-y-5">
        <p className="eyebrow">Next announced world event</p>
        <h2 className="text-3xl font-black text-chrome">Hong Kong · 2027</h2>
        <p className="text-titanium">WSB’s announcement lists 15–18 April 2027 at Queen Elizabeth Stadium.</p>
        <a href={WSB.championship.announcement} target="_blank" rel="noreferrer" className="text-link">Read the event announcement <Arrow diagonal /></a>
      </article>
    </section>

    <section className="border-t border-subtle pt-8 flex flex-col md:flex-row md:items-end justify-between gap-5">
      <div><p className="eyebrow">Competition information</p><h2 className="text-2xl font-bold text-chrome">Use the source for your event.</h2><p className="mt-2 max-w-2xl text-titanium">This app does not publish an approved global scoring rubric, division limits or judge credentials. Check the official source linked by WSB and the organizer’s event-specific guidance.</p></div>
      <Link href="/events/world-championship-2027/rules" className="text-link">Rules and source documents <Arrow /></Link>
    </section>
  </main>;
}
