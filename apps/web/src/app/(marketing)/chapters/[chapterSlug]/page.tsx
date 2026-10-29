import Link from "next/link";
import { Arrow, PageHeading, Status } from "@/components/ui";

export default async function ChapterHomePage({
  params,
}: {
  params: Promise<{ chapterSlug: string }>;
}) {
  const { chapterSlug } = await params;
  const isHk = chapterSlug === "hk" || chapterSlug.includes("hong-kong");
  const isAu = chapterSlug === "au" || chapterSlug.includes("australia");
  const chapterName = isHk ? "WSB Hong Kong" : isAu ? "WSB Australia" : "WSB Philippines";
  const flag = isHk ? "🇭🇰" : isAu ? "🇦🇺" : "🇵🇭";
  const city = isHk ? "Hong Kong SAR" : isAu ? "Sydney, New South Wales" : "Manila, National Capital Region";

  return (
    <main id="main-content" className="section-wrap py-12">
      <Link className="back-link mb-6 inline-block" href="/chapters">
        ← All Chapters
      </Link>

      <PageHeading
        eyebrow={`Official National Chapter / ${chapterSlug.toUpperCase()}`}
        title={`${flag} ${chapterName}`}
        description={`Governing body for World Supremacy Battlegrounds sanctioned qualifiers and dancer credentials in ${city}.`}
        action={
          <div className="flex gap-2">
            <Link href="/events" className="button button-outline">
              Chapter Events <Arrow />
            </Link>
            <Link href="/sign-up" className="button button-volt">
              Join Chapter <Arrow diagonal />
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
        <div className="col-span-2 space-y-6">
          <section className="panel p-6">
            <h2 className="text-xl font-bold text-chrome mb-3">Chapter Sanctioning & Mission</h2>
            <p className="text-sm text-titanium leading-relaxed mb-4">
              WSB operates through verified regional chapters to uphold standardized international judging, ensure youth dancer safety,
              and cultivate national champions capable of competing at the World Championship.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-3 bg-tungsten rounded border border-subtle">
                <span className="text-xs text-titanium block mb-1">Affiliated Crews</span>
                <strong className="text-xl mono text-volt">40+ Crews</strong>
              </div>
              <div className="p-3 bg-tungsten rounded border border-subtle">
                <span className="text-xs text-titanium block mb-1">Championship Qualifiers</span>
                <strong className="text-xl mono text-chrome">Annual Circuit</strong>
              </div>
            </div>
          </section>

          <section className="panel p-6">
            <h2 className="text-xl font-bold text-chrome mb-3">Active Qualifier Events</h2>
            <div className="space-y-3">
              <div className="p-4 bg-tungsten rounded border border-subtle flex justify-between items-center">
                <div>
                  <strong className="text-chrome block">
                    {isHk ? "Hong Kong World Championship 2027" : isAu ? "WSB Sydney Championship 2027" : "Manila Session 2027"}
                  </strong>
                  <span className="text-xs text-titanium">Official Qualifier · 5 Divisions</span>
                </div>
                <Link
                  href={isHk ? "/events/hk-championship-2027" : "/events/manila-session"}
                  className="button button-outline text-xs"
                >
                  View Details <Arrow />
                </Link>
              </div>
            </div>
          </section>
        </div>

        <aside className="panel p-6 space-y-4">
          <h3 className="text-lg font-bold text-chrome">Chapter Secretariat</h3>
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-titanium block">Regional Director:</span>
              <strong className="text-chrome">Accredited WSB Board</strong>
            </div>
            <div>
              <span className="text-titanium block">Inquiries:</span>
              <strong className="text-volt mono">info.{chapterSlug}@worldsupremacybattlegrounds.com</strong>
            </div>
            <div>
              <span className="text-titanium block">Operational Currency:</span>
              <strong className="text-chrome mono">{isHk ? "HKD ($)" : isAu ? "AUD ($)" : "PHP (₱)"}</strong>
            </div>
          </div>
          <div className="pt-4 border-t border-subtle">
            <Link href="/contact" className="button button-volt w-full text-center">
              Contact Secretariat <Arrow diagonal />
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}