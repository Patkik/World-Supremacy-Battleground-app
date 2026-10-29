import Link from "next/link";
import { Arrow, PageHeading, Status } from "@/components/ui";

export default async function EventRulesPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;

  return (
    <main id="main-content" className="section-wrap py-12">
      <Link className="back-link mb-6 inline-block" href={`/events/${eventSlug}`}>
        ← Back to Event Overview
      </Link>

      <PageHeading
        eyebrow={`Official Governance / ${eventSlug.toUpperCase()}`}
        title="Competition Rules & Scoring Rubric"
        description="Official World Supremacy Battlegrounds 2027 Regulations, Headcount Bounds, and Criteria Point Allocations."
        action={
          <Link href={`/app/register/${eventSlug}`} className="button button-volt">
            Register Crew <Arrow diagonal />
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
        <div className="col-span-2 space-y-8">
          {/* Section 1: Scoring Rubric */}
          <section className="panel p-6">
            <h2 className="text-xl font-bold text-chrome mb-4">Official 100-Point Judging Criteria</h2>
            <p className="text-sm text-titanium mb-4">
              Judges evaluate routines live across five distinct technical categories, with each category scored from 0.0 to 20.0 points.
            </p>

            <div className="space-y-4 text-sm">
              <div className="p-3 bg-tungsten rounded border border-subtle flex justify-between items-center">
                <div>
                  <strong className="text-chrome block">Choreography & Originality</strong>
                  <span className="text-xs text-titanium">Creativity, sequence difficulty, formations, and floor craft</span>
                </div>
                <span className="mono text-volt font-bold">20.0 PTS</span>
              </div>

              <div className="p-3 bg-tungsten rounded border border-subtle flex justify-between items-center">
                <div>
                  <strong className="text-chrome block">Musicality & Timing</strong>
                  <span className="text-xs text-titanium">Rhythm syncopation, audio dynamics, beat drops, and accents</span>
                </div>
                <span className="mono text-volt font-bold">20.0 PTS</span>
              </div>

              <div className="p-3 bg-tungsten rounded border border-subtle flex justify-between items-center">
                <div>
                  <strong className="text-chrome block">Execution & Technique</strong>
                  <span className="text-xs text-titanium">Synchronization, body control, isolation sharpness, and landing</span>
                </div>
                <span className="mono text-volt font-bold">20.0 PTS</span>
              </div>

              <div className="p-3 bg-tungsten rounded border border-subtle flex justify-between items-center">
                <div>
                  <strong className="text-chrome block">Stage Presence & Energy</strong>
                  <span className="text-xs text-titanium">Intensity, passion, projection to auditorium audience, and command</span>
                </div>
                <span className="mono text-volt font-bold">20.0 PTS</span>
              </div>

              <div className="p-3 bg-tungsten rounded border border-subtle flex justify-between items-center">
                <div>
                  <strong className="text-chrome block">Overall Entertainment Value</strong>
                  <span className="text-xs text-titanium">Audience engagement, theatrical flow, attire coherence, and impact</span>
                </div>
                <span className="mono text-volt font-bold">20.0 PTS</span>
              </div>
            </div>
          </section>

          {/* Section 2: Penalties and Deductions */}
          <section className="panel p-6">
            <h2 className="text-xl font-bold text-crimson mb-2">Penalties & Deductions</h2>
            <p className="text-sm text-titanium mb-4">
              Deductions are assessed by the Head Judge and subtracted directly from the raw aggregate score.
            </p>
            <ul className="text-sm text-titanium list-disc list-inside space-y-2">
              <li><strong>Time Overrun:</strong> 0.5 points deducted per 5 seconds exceeding the division duration cap.</li>
              <li><strong>Stage Fall / Uncontrolled Collision:</strong> 1.0 point deducted per occurrence.</li>
              <li><strong>Inappropriate Attire / Unclean Language:</strong> 2.0 to 5.0 points deduction at Head Judge discretion.</li>
              <li><strong>Headcount Infraction:</strong> Routines with fewer or more dancers than permitted face immediate disqualification.</li>
            </ul>
          </section>
        </div>

        {/* Division Specs Aside */}
        <aside className="space-y-6">
          <div className="panel p-6 space-y-4">
            <h3 className="text-lg font-bold text-chrome">Division Specifications</h3>
            
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-tungsten rounded border border-subtle">
                <strong className="text-chrome block">Open Crew</strong>
                <span className="text-titanium">5–14 dancers · Max 3:00 min · All ages</span>
              </div>

              <div className="p-3 bg-tungsten rounded border border-subtle">
                <strong className="text-chrome block">Monster Crew</strong>
                <span className="text-titanium">20–40 dancers · Max 4:00 min · All ages</span>
              </div>

              <div className="p-3 bg-tungsten rounded border border-subtle">
                <strong className="text-chrome block">Varsity Ignite</strong>
                <span className="text-titanium">5–18 dancers · Max 2:30 min · 14 & Under</span>
              </div>

              <div className="p-3 bg-tungsten rounded border border-subtle">
                <strong className="text-chrome block">Monster Varsity</strong>
                <span className="text-titanium">10–30 dancers · Max 3:00 min · 18 & Under</span>
              </div>
            </div>

            <Link href={`/app/register/${eventSlug}`} className="button button-volt w-full text-center">
              Register Division Entry <Arrow />
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}