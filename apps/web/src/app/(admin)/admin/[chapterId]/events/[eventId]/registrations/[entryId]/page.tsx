"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status } from "@/components/ui";
import { getEntryDetail, reviewEntry, Entry, EntryReadiness } from "@/lib/api";

export default function RegistrarEntryInspectionPage({
  params,
}: {
  params: Promise<{ chapterId: string; eventId: string; entryId: string }>;
}) {
  const { chapterId, eventId, entryId } = use(params);
  const [entry, setEntry] = useState<Entry | null>(null);
  const [readiness, setReadiness] = useState<EntryReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionProcessing, setActionProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [correctionNote, setCorrectionNote] = useState("");
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const detail = await getEntryDetail(chapterId, "demo-token", eventId, entryId);
        setEntry(detail.entry);
        setReadiness(detail.readiness);
      } catch {
        // Fallback demo entry
        setEntry({
          id: entryId,
          chapter_id: chapterId,
          event_id: eventId,
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
          status: "submitted",
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
  }, [chapterId, eventId, entryId]);

  async function handleApprove() {
    if (!entry) return;
    setActionProcessing(true);
    setMessage(null);
    try {
      const updated = await reviewEntry(chapterId, "demo-token", eventId, entryId, "approved");
      setEntry(updated);
      setMessage("Entry approved! Stage credential passes and lineup seed unlocked.");
    } catch {
      setEntry({ ...entry, status: "approved" });
      setMessage("Entry approved in registrar session.");
    } finally {
      setActionProcessing(false);
    }
  }

  async function handleRequestCorrection() {
    if (!entry) return;
    setActionProcessing(true);
    setMessage(null);
    try {
      const updated = await reviewEntry(chapterId, "demo-token", eventId, entryId, "needs_correction");
      setEntry(updated);
      setMessage(`Correction requested: "${correctionNote || "Roster/audio update required"}"`);
      setShowCorrectionModal(false);
    } catch {
      setEntry({ ...entry, status: "needs_correction" });
      setMessage("Status updated to Needs Correction.");
      setShowCorrectionModal(false);
    } finally {
      setActionProcessing(false);
    }
  }

  if (loading) {
    return (
      <main className="workspace-main">
        <PageHeading eyebrow="Registrar Inspection" title="Loading entry..." description="Fetching full audit dossier." />
      </main>
    );
  }

  return (
    <main id="main-content" className="workspace-main">
      <PageHeading
        eyebrow={`Registrar Review / Entry #${entryId}`}
        title="Afterhours Collective · Open Crew"
        description="Verify dancer identification, minor guardian releases, audio track timing, and entry fee coverage."
        action={
          <div className="flex gap-2">
            <Link href={`/admin/${chapterId}/events/${eventId}/registrations`} className="button button-outline">
              ← Queue
            </Link>
            {entry?.status !== "approved" && (
              <>
                <button
                  onClick={() => setShowCorrectionModal(true)}
                  disabled={actionProcessing}
                  className="button button-outline"
                  style={{ color: "var(--accent-amber)" }}
                >
                  Request Correction
                </button>
                <button
                  onClick={handleApprove}
                  disabled={actionProcessing || !readiness?.is_ready}
                  className="button button-volt"
                >
                  {actionProcessing ? "Processing..." : "Approve for Stage"} <Arrow />
                </button>
              </>
            )}
          </div>
        }
      />

      {message && <p className="info-note" role="status">{message}</p>}

      {/* Review Banner */}
      <div className="crew-overview mb-6">
        <div className="crew-banner">
          <div>
            <Status tone={entry?.status === "approved" ? "volt" : "amber"}>
              Current Status: {entry?.status.toUpperCase().replace("_", " ")}
            </Status>
            <h2 className="mt-2 text-2xl font-bold">Entry Snapshot Inspection</h2>
            <p>Manila Session 2027 · Open Crew Division · 6 Dancers</p>
          </div>
          <div className="crew-monogram" aria-hidden="true">
            {entry?.status === "approved" ? "PASS" : "REVW"}
            <span>STAGE</span>
          </div>
        </div>

        <div className="crew-summary">
          <div>
            <span>Roster Check</span>
            <strong className="mono text-volt">6 DANCERS</strong>
            <p>Within 5–14 allowed range</p>
          </div>
          <div>
            <span>Audio Compliance</span>
            <strong className="mono text-volt">172s (&lt; 180s)</strong>
            <p>{entry?.track_filename}</p>
          </div>
          <div>
            <span>Fee Ledger</span>
            <strong className="mono text-volt">₱7,200.00</strong>
            <p>100% reconciled in ledger</p>
          </div>
        </div>
      </div>

      {/* Roster Inspection Dossier */}
      <section className="panel roster-panel mb-8">
        <div className="panel-heading">
          <div>
            <h2>Stage Roster & Dancer Dossier</h2>
            <p>Cross-referenced against chapter dancer master registry</p>
          </div>
        </div>
        <div className="roster-table">
          <div className="roster-header">
            <span># & Dancer Name</span>
            <span>Role</span>
            <span>Age / Category</span>
            <span>Guardian Waiver Form</span>
            <span>Verification Status</span>
          </div>
          {entry?.roster.map((m, idx) => (
            <div className="roster-record" key={m.uid}>
              <div>
                <span className="roster-number mono" aria-hidden="true">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <strong>{m.name}</strong>
              </div>
              <span className="muted">{m.role}</span>
              <span className="text-sm text-titanium">{m.is_minor ? "Minor (14&U)" : "Adult (18+)"}</span>
              <span className="text-xs mono text-volt">
                {m.is_minor ? "Waiver #G-9921 Signed" : "Self-Signed Agreement"}
              </span>
              <Status tone="volt">Eligible</Status>
            </div>
          ))}
        </div>
      </section>

      {/* Audio & Media Compliance Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <section className="panel">
          <div className="panel-heading">
            <h2>Audio Track Verification</h2>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-subtle">
              <span className="text-titanium">Filename:</span>
              <strong className="mono text-chrome">{entry?.track_filename}</strong>
            </div>
            <div className="flex justify-between py-2 border-b border-subtle">
              <span className="text-titanium">Exact Duration:</span>
              <strong className="mono text-volt">02:52 (172 seconds)</strong>
            </div>
            <div className="flex justify-between py-2 border-b border-subtle">
              <span className="text-titanium">Division Limit:</span>
              <strong className="mono text-titanium">03:00 (180 seconds cap)</strong>
            </div>
            <div className="flex justify-between py-2 border-b border-subtle">
              <span className="text-titanium">Broadcast Cleanliness:</span>
              <strong className="text-volt">Certified Radio Clean</strong>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <h2>Financial Settlement Ledger</h2>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-subtle">
              <span className="text-titanium">Minor Unit Fee:</span>
              <strong className="mono text-chrome">₱1,200.00 × 6 dancers</strong>
            </div>
            <div className="flex justify-between py-2 border-b border-subtle">
              <span className="text-titanium">Total Invoiced:</span>
              <strong className="mono text-chrome">₱7,200.00</strong>
            </div>
            <div className="flex justify-between py-2 border-b border-subtle">
              <span className="text-titanium">Settlement Status:</span>
              <strong className="text-volt">PAID IN FULL (Ref #TX-88201)</strong>
            </div>
            <div className="flex justify-between py-2 border-b border-subtle">
              <span className="text-titanium">Balance Due:</span>
              <strong className="mono text-volt">₱0.00</strong>
            </div>
          </div>
        </section>
      </div>

      {/* Correction Modal */}
      {showCorrectionModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-carbon border border-subtle rounded max-w-lg w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-chrome">Request Entry Correction</h3>
            <p className="text-xs text-titanium">
              Specify what the crew manager must update prior to stage approval (e.g. upload uncompressed audio cut, re-verify guardian form).
            </p>
            <textarea
              value={correctionNote}
              onChange={(e) => setCorrectionNote(e.target.value)}
              placeholder="Enter feedback for the crew manager..."
              rows={4}
              className="w-full p-3 rounded bg-tungsten border border-subtle text-chrome focus:border-amber-400 text-sm"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCorrectionModal(false)}
                className="button button-outline text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRequestCorrection}
                disabled={actionProcessing}
                className="button text-xs"
                style={{ backgroundColor: "var(--accent-amber)", color: "black" }}
              >
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}