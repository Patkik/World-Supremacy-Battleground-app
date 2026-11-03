import Image from "next/image";
import Link from "next/link";

export default async function ArenaBracketPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  return <main className="arena-display min-h-dvh">
    <Image src="/images/dance-hero.png" alt="" fill sizes="100vw" className="arena-background" priority />
    <div className="arena-shade" />
    <header className="arena-header"><div className="arena-brand"><Image src="/brand/wsb-logo.png" className="brand-mark-white" alt="World Supremacy Battlegrounds" width={100} height={100} /><span>WORLD SUPREMACY<br />BATTLEGROUNDS</span></div><div className="arena-event-label"><span>Battle bracket · {eventId}</span><span className="mono text-xs">PUBLIC BRACKET UNAVAILABLE</span></div></header>
    <section className="arena-stage"><span className="eyebrow">Policy and publication gate</span><h1>Bracket information is not published.</h1><p className="max-w-3xl text-titanium">WSB has no approved public bracket and advancement policy for this event yet. Matchups, winners and votes will appear here only after an authorized bracket is published.</p></section>
    <footer className="arena-bottom"><div><span className="eyebrow">Event display</span><strong>No public bracket data</strong><span>Results remain available only through the published results view.</span></div><Link href={`/arena-live/${encodeURIComponent(eventId)}/results`} className="text-link">Published results</Link></footer>
  </main>;
}
