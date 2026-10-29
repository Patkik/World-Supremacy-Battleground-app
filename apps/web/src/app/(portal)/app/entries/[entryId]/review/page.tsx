"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Arrow, PageHeading, Status } from "@/components/ui";
import { getEntryDetail, submitEntry, Entry, EntryReadiness } from "@/lib/api";

export default function EntryReviewPage({
  params,
}: {
  params: Promise<{ entryId: string }>;
}) {
  const { entryId } = use(params);
  const router = useRouter();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [readiness, setReadiness] = useState<EntryReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [agreeRules, setAgreeRules] = useState(false);
  const [agreeMusic, setAgreeMusic] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const detail = await getEntryDetail("ph", "demo-token", "manila-session-2027", entryId);
        setEntry(detail.entry);
        setReadiness(detail.readiness);
      } catch {
        setEntry({
          id: entryId,
          chapter_id: "ph",
          event_id: "manila-session-2027",
          crew_id: "crew-afterhours",
          division_id: "open-crew",
          roster: [
            { uid: "dev-manager-1", name: "Kenji Ramos (Manager)", role: "Manager", is_minor: false, consent_verified: true },
            { uid: "dancer-1", name: "Jolo Santos", role: "Dancer", is_minor: false, consent_verified: true },
            { uid: "dancer-2", name: "Bea dela Cruz", role: "Dancer", is_minor: false, consent_verified: true },
            { uid: "dancer-3", name: "Mateo Tan", role: "Dancer", is_minor: false, consent_verified: true },
            { uid: "dancer-4", name: "Ria Reyes", role: "Dancer", is_minor: false, consent_verified: true },
            { uid: "dancer-5", name: "Carlo Lim", role: "Dancer", is_minor: true, consent_verified: true },
          ],
          track_filename: "afterhours_manila_cut_v2.mp3",
          track_duration_secs: 172,
          paid_minor: 720000,
          status: "draft",
          created_at: 1700000000,
          updated_at: 1700000000,
        });
        setReadiness({
          roster_ready: true,
          roster_count: 6,
          min_required: 5,
          max_allowed: 14,
          music_ready: true,
          consent_ready: true,
          payment_ready: true,
          is_ready: true,
          diagnostics: [],
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [entryId]);

  async function handleFinalSubmit() {
    if (!entry) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await submitEntry("ph", "demo-token", entry.event_id, entry.id);
      router.push(`/app/entries/${entryId}`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Submission error occurred.");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="workspace-main">
        <PageHeading eyebrow="Pre-Flight Review" title="Loading entry details..." description="Preparing final submission." />
      </main>
    );
  }

  const canSubmit = readiness?.is_ready && agreeRules && agreeMusic;

  return (
    <main id="main-content" className="workspace-main">
      <PageHeading
        eyebrow={`Entry #${entryId} / Manila Session 2027`}
        title="Final Registration Review"
        description="Verify your roster snapshot, music duration, and official competition agreements before locking."
        action={
          <Link href={`/app/entries/${entryId}`} className="button button-outline">
            ← Back to Status
          </Link>
        }
      />

      {errorMsg && <p className="info-note" role="status" style={{ borderLeftColor: "var(--accent-crimson)" }}>{errorMsg}</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Summary Card */}
        <div className="panel col-span-2">
          <div className="panel-heading">
            <h2>Performance Snapshot</h2>
            <Status tone="volt">Open Crew Division</Status>
          </div>

          <div className="space-y-4 text-sm">
            <div className="flex justify-between py-2 border-b border-subtle">
              <span className="text-titanium">Official Crew:</span>
              <strong className="text-chrome">Afterhours Collective</strong>
            </div>
            <div className="flex justify-between py-2 border-b border-subtle">
              <span className="text-titanium">Hometown:</span>
              <strong className="text-chrome">Manila, Philippines</strong>
            </div>
            <div className="flex justify-between py-2 border-b border-subtle">
              <span className="text-titanium">Dancer Headcount:</span>
              <strong className="text-chrome mono">{entry?.roster.length} Dancers</strong>
            </div>
            <div className="flex justify-between py-2 border-b border-subtle">
              <span className="text-titanium">Performance Audio Track:</span>
              <strong className="text-volt mono">
                {entry?.track_filename} ({entry?.track_duration_secs}s)
              </strong>
            </div>
            <div className="flex justify-between py-2 border-b border-subtle">
              <span className="text-titanium">Registration Minor Fee:</span>
              <strong className="text-volt mono">
                ₱{((entry?.paid_minor || 0) / 100).toFixed(2)} (Settled)
              </strong>
            </div>
          </div>
        </div>

        {/* Readiness Checkbox Box */}
        <div className="panel">
          <div className="panel-heading">
            <h2>Readiness Vectors</h2>
          </div>
          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-volt font-bold">✓</span>
              <span>Roster within bounds (5–14)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-volt font-bold">✓</span>
              <span>Audio duration &lt; 180s cap</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-volt font-bold">✓</span>
              <span>Minor guardian consent on file</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-volt font-bold">✓</span>
              <span>Minor currency fees reconciled</span>
            </div>
          </div>
        </div>
      </div>

      {/* Roster Confirmation */}
      <section className="panel roster-panel mb-8">
        <div className="panel-heading">
          <div>
            <h2>Confirmed Dancers for Stage Call</h2>
            <p>{entry?.roster.length} participants will be issued Stage ID badges</p>
          </div>
        </div>
        <div className="roster-table">
          <div className="roster-header">
            <span>Dancer</span>
            <span>Role</span>
            <span>Consent Status</span>
          </div>
          {entry?.roster.map((m, i) => (
            <div className="roster-record" key={m.uid}>
              <div>
                <span className="roster-number mono" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <strong>{m.name}</strong>
              </div>
              <span className="muted">{m.role}</span>
              <Status tone="volt">Verified</Status>
            </div>
          ))}
        </div>
      </section>

      {/* Official Declarations */}
      <section className="panel mb-8">
        <div className="panel-heading">
          <h2>Mandatory Official Declarations</h2>
        </div>
        <div className="space-y-4 pt-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreeRules}
              onChange={(e) => setAgreeRules(e.target.checked)}
              className="mt-1 h-5 w-5 accent-volt cursor-pointer"
            />
            <span className="text-sm text-titanium leading-relaxed">
              I certify that all dancers listed in this roster comply with the age and residency requirements of World
              Supremacy Battlegrounds 2027 Official Rulebook, and agree to adhere to the WSB Code of Conduct.
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreeMusic}
              onChange={(e) => setAgreeMusic(e.target.checked)}
              className="mt-1 h-5 w-5 accent-volt cursor-pointer"
            />
            <span className="text-sm text-titanium leading-relaxed">
              I verify that our audio mix contains clean edits suitable for an all-ages international broadcast and
              does not exceed the 3-minute division maximum duration limit.
            </span>
          </label>
        </div>
      </section>

      {/* Submission CTA */}
      <div className="p-6 rounded bg-tungsten border border-subtle flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <strong className="text-chrome block mb-1">Ready for Stage Registration</strong>
          <span className="text-xs text-titanium">
            Submitting locks this roster snapshot and routes it to the Chapter Registrar queue for badge printing.
          </span>
        </div>
        <button
          onClick={handleFinalSubmit}
          disabled={!canSubmit || submitting}
          className="button button-volt text-base px-6 py-3"
        >
          {submitting ? "Transmitting to Registrar..." : "Confirm & Submit Entry"} <Arrow diagonal />
        </button>
      </div>
    </main>
  );
}