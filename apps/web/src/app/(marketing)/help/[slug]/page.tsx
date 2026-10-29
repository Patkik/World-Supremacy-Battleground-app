import Link from "next/link";
import { Arrow, PageHeading } from "@/components/ui";

export default async function HelpArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const title = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <main id="main-content" className="section-wrap py-12">
      <Link className="back-link mb-6 inline-block" href="/help">
        ← Help Center
      </Link>

      <PageHeading
        eyebrow="Knowledge Base Article"
        title={title}
        description="Official guidance on competition entry, eligibility verification, audio track compliance, and stage rules."
      />

      <div className="max-w-3xl panel p-8 mt-8 space-y-6 text-titanium leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-chrome mb-2">Overview</h2>
          <p className="text-sm">
            World Supremacy Battlegrounds requires all participating crews and dancers to complete digital onboarding,
            satisfy residency and age verification, and maintain valid guardian releases for youth divisions.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-chrome mb-2">Step-by-Step Guidance</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li><strong>Sign in to your crew workspace:</strong> Ensure you are assigned the Manager role for your crew.</li>
            <li><strong>Add dancers to your roster:</strong> Dancers must accept single-use invitation tokens and complete personal profiles.</li>
            <li><strong>Verify minor consent:</strong> Dancers under 18 must have an authorized parent or legal guardian e-sign the official liability waiver.</li>
            <li><strong>Upload performance track:</strong> Audio tracks must be uploaded in MP3 or WAV format within the division duration cap.</li>
            <li><strong>Submit to Registrar:</strong> Review your 4 readiness vectors and submit for authoritative stage approval.</li>
          </ol>
        </section>

        <section className="p-4 bg-tungsten rounded border border-subtle">
          <strong className="text-volt text-sm block mb-1">Need additional assistance?</strong>
          <p className="text-xs text-titanium mb-3">
            Contact your local Chapter Registrar or open a ticket through the participant support portal.
          </p>
          <Link href="/contact" className="button button-outline text-xs">
            Contact Operations Support <Arrow diagonal />
          </Link>
        </section>
      </div>
    </main>
  );
}