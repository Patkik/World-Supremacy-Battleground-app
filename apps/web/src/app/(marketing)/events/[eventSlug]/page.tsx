import Image from "next/image";
import Link from "next/link";
import { Arrow, Status } from "@/components/ui";

export default async function DynamicEventPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;
  const isHk = eventSlug.includes("hk") || eventSlug.includes("world-championship");
  const title = isHk ? "HONG KONG WORLD CHAMPIONSHIP" : eventSlug.toUpperCase().replace(/-/g, " ");
  const date = isHk ? "18–21 NOV 2027" : "18 JUL 2027";
  const venue = isHk ? "Queen Elizabeth Stadium, Hong Kong" : "SMX Convention Center, Manila, Philippines";

  return (
    <main id="main-content">
      <section className="event-detail-hero section-wrap">
        <Link className="back-link" href="/events">
          ← All events
        </Link>
        <div className="event-detail-grid">
          <div>
            <Status tone="volt">Official WSB Championship Event</Status>
            <h1>{title}.</h1>
            <p className="lede">
              The worldwide street dance championship movement.<br />
              Represent your country, your crew, and your heritage.
            </p>
            <div className="flex gap-3">
              <Link href={`/app/register/${eventSlug}`} className="button button-volt">
                Enter Your Crew <Arrow diagonal />
              </Link>
              <Link href={`/events/${eventSlug}/rules`} className="button button-outline">
                Event Rules & Scoring <Arrow />
              </Link>
            </div>
          </div>
          <div className="event-detail-photo">
            <Image
              src="/images/dance-hero.png"
              alt="Dancers competing on the WSB stage"
              fill
              sizes="(max-width:767px) 100vw, 50vw"
              priority
            />
            <span>Official Battleground.</span>
          </div>
        </div>
      </section>

      <section className="event-facts">
        <div>
          <span>Competition Dates</span>
          <strong className="mono">{date}</strong>
        </div>
        <div>
          <span>Host Venue</span>
          <strong>{venue}</strong>
        </div>
        <div>
          <span>Divisions</span>
          <strong className="mono">Open, Monster, Varsity</strong>
        </div>
        <div>
          <span>Governance</span>
          <strong>WSB International Rules</strong>
        </div>
      </section>

      <section className="section-wrap event-info-grid">
        <div>
          <p className="eyebrow">Championship Overview</p>
          <h2>BRING THE HEAT.<br />STEP ONTO THE WORLD STAGE.</h2>
          <p className="body-copy">
            Every crew undergoes authoritative roster verification, audio compliance screening, and fair judging under
            the accredited WSB scoring rubric. Secure your division entry before registration cutoffs close.
          </p>

          <h3 className="subsection-title">Official Championship Divisions</h3>
          <div className="space-y-3 pt-2">
            {[
              { name: "Open Crew", bounds: "5–14 dancers", duration: "180s cap" },
              { name: "Monster Crew", bounds: "20–40 dancers", duration: "240s cap" },
              { name: "Varsity Ignite (14&U)", bounds: "5–18 dancers", duration: "150s cap" },
              { name: "Monster Varsity (18&U)", bounds: "10–30 dancers", duration: "180s cap" },
            ].map((div) => (
              <div key={div.name} className="division-row">
                <div>
                  <h3>{div.name}</h3>
                  <p>{div.bounds} · Max track duration: {div.duration}</p>
                </div>
                <Status tone="volt">Open</Status>
              </div>
            ))}
          </div>
        </div>

        <aside className="event-aside">
          <h3>The Way to the Floor</h3>
          <ol>
            <li>Create or sign into your crew account</li>
            <li>Select your championship division</li>
            <li>Build and lock your dancer roster snapshot</li>
            <li>Upload your master performance track</li>
            <li>Settle entry fee and receive stage passes</li>
          </ol>
          <Link href={`/app/register/${eventSlug}`} className="button button-volt">
            Register Crew Now <Arrow />
          </Link>
          <Link href={`/events/${eventSlug}/rules`} className="text-link">
            Review Official Rules <Arrow diagonal />
          </Link>
        </aside>
      </section>
    </main>
  );
}