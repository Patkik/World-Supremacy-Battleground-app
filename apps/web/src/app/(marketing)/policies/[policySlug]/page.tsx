import Link from "next/link";
import { Arrow, PageHeading } from "@/components/ui";

export default async function PolicyDocumentPage({
  params,
}: {
  params: Promise<{ policySlug: string }>;
}) {
  const { policySlug } = await params;
  const title = policySlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <main id="main-content" className="section-wrap py-12">
      <Link className="back-link mb-6 inline-block" href="/">
        ← Back to WSB Home
      </Link>

      <PageHeading
        eyebrow="Governance & Legal Compliance"
        title={title}
        description="Official World Supremacy Battlegrounds competition policies, participant safeguards, and data governance."
      />

      <div className="max-w-3xl panel p-8 mt-8 space-y-6 text-titanium text-sm leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-chrome mb-2">1. Purpose and Scope</h2>
          <p>
            World Supremacy Battlegrounds is dedicated to providing an international platform that is safe, equitable,
            transparent, and respectful for all dancers, judges, crew managers, and spectators. This policy applies across
            all sanctioned regional qualifiers and the World Championship.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-chrome mb-2">2. Minor Protection & Guardian Verification</h2>
          <p>
            The safety and well-being of youth participants is paramount. All dancers under 18 years of age must submit
            verifiable parental or legal guardian consent prior to stage access. No minor may perform without an approved
            guardian waiver signed and counter-verified by the Chapter Registrar.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-chrome mb-2">3. Intellectual Property & Music Broadcast Rights</h2>
          <p>
            Participating crews must ensure their submitted performance tracks are properly licensed or fair-use compliant for
            live auditorium presentation and authorized livestream broadcast. Explicit lyrical content and hate speech are
            strictly prohibited and subject to immediate disqualification.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-chrome mb-2">4. Code of Sportsmanship</h2>
          <p>
            Competitors must uphold the highest standards of street dance culture and mutual respect. Any harassment,
            unsportsmanlike conduct, physical intimidation, or deliberate stage disruption will result in immediate ejection
            and potential season suspension across all WSB chapters.
          </p>
        </section>

        <div className="pt-4 border-t border-subtle">
          <span className="text-xs text-muted block mb-2">Effective Version: WSB-POL-2027.1 · Last Revised January 2027</span>
          <Link href="/help" className="text-link text-xs">
            Return to Help Center <Arrow />
          </Link>
        </div>
      </div>
    </main>
  );
}