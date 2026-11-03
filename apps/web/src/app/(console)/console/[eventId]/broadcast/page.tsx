import Link from "next/link";
import { Arrow, Brand, PageHeading } from "@/components/ui";

export default async function BroadcastControlPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  return <div className="judge-shell">
    <header className="judge-header"><Brand /><div className="judge-event"><strong>Public event display</strong><span>Event #{eventId}</span></div><Link href={`/arena-live/${encodeURIComponent(eventId)}`} target="_blank" className="text-link">Open public display <Arrow diagonal /></Link></header>
    <main className="max-w-4xl mx-auto p-6 space-y-8">
      <PageHeading eyebrow="Director controlled projection" title="Event stage display" description="A chapter director can publish one active stage to the public display from the stage workspace. Changes require a reason and are saved with the stage configuration revision." />
      <section className="panel p-6 space-y-4"><h2 className="text-xl font-bold text-chrome">Publish stage information</h2><p className="text-titanium">The public view shows the event and chapter names, current crew and division labels, and whether the stage is held. It does not show dancer identities, scores, payment data or the draft lineup.</p><p className="text-sm text-muted">LED hardware, stream overlays, scene switching, sponsor tickers and screen connection status are not connected to WSB.</p><Link href={`/console/${encodeURIComponent(eventId)}/marshal`} className="button button-volt inline-flex items-center gap-2" style={{ minHeight: 56 }}>Open stage workspace <Arrow diagonal /></Link></section>
    </main>
  </div>;
}
