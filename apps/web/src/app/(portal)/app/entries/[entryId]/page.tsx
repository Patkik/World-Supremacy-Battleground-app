"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status } from "@/components/ui";
import { getEntryDetail, submitEntry, Entry, EntryReadiness } from "@/lib/api";

export default function EntryStatusPage({
  params,
}: {
  params: Promise<{ entryId: string }>;
}) {
  const { entryId } = use(params);
  const [entry, setEntry] = useState<Entry | null>(null);
  const [readiness, setReadiness] = useState<EntryReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await getEntryDetail("ph", "demo-token", "manila-session-2027", entryId);
        setEntry(res.entry);
        setReadiness(res.readiness);
      } catch {
        // Fallback realistic demo entry
        const fallbackEntry: Entry = {
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
          status: "submitted",
          created_at: 1700000000,
          updated_at: 1700000000,
        };
        setEntry(fallbackEntry);
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

  async function handleSubmit() {
    if (!entry) return;
    setSubmitting(true);
    setNotice(null);
    try {
      const updated = await submitEntry("ph", "demo-token", entry.event_id, entry.id);
      setEntry(updated);
      setNotice("Entry submitted to Registrar Queue for official stage verification.");
    } catch (err: unknown) {
      setNotice(err instanceof Error ? err.message : "Submission error");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="workspace-main">
        <PageHeading eyebrow="Entry Verification" title="Loading entry status..." description="Evaluating multi-factor readiness." />
      </main>
    );
  }

  const statusToneMap: Record<string, "volt" | "amber" | "neutral"> = {
    approved: "volt",
    submitted: "volt",
    needs_correction: "amber",
    draft: "amber",
    withdrawn: "neutral",
  };

  return (
    <main id="main-content" className="workspace-main">
      <PageHeading
        eyebrow={`Manila Session 2027 / Entry #${entryId}`}
        title={`Division: ${entry?.division_id.toUpperCase().replace("-", " ")}`}
        description="Authoritative 4-Vector Computed Readiness: Roster Limits, Music Audio, Guardian Consent, and Payment Coverage."
        action={
          <div className="flex gap-2">
            <Link href={`/app/crews/${entry?.crew_id}`} className="button button-outline">
              ← Crew Workspace
            </Link>
            {entry?.status !== "approved" && (
              <button
                onClick={handleSubmit}
                disabled={submitting || !readiness?.is_ready}
                className="button button-volt"
              >
                {submitting ? "Submitting..." : "Submit to Registrar"} <Arrow diagonal />
              </button>
            )}
          </div>
        }
      />

      {notice && <p className="info-note" role="status">{notice}</p>}

      {/* Entry Status Overview Banner */}
      <div className="crew-overview mb-6">
        <div className="crew-banner">
          <div>
            <Status tone={statusToneMap[entry?.status || "draft"]}>
              Status: {entry?.status.toUpperCase().replace("_", " ")}
            </Status>
            <h2 className="mt-2 text-2xl font-bold">Crew: Afterhours Collective</h2>
            <p>Manila, Philippines <span> / </span> Event: Manila Session 2027</p>
          </div>
          <div className="crew-monogram" aria-hidden="true">
            {readiness?.is_ready ? "100%" : "HOLD"}
            <span>STAGE</span>
          </div>
        </div>

        <div className="crew-summary">
          <div>
            <span>Roster Headcount</span>
            <strong className="mono">{entry?.roster.length || 0} / {readiness?.max_allowed}</strong>
            <p>Minimum required: {readiness?.min_required}</p>
          </div>
          <div>
            <span>Audio Compliance</span>
            <strong className="mono">{entry?.track_duration_secs ? `${entry.track_duration_secs}s` : "Pending"}</strong>
            <p>Max duration: 180s cap</p>
          </div>
          <div>
            <span>Fee Coverage</span>
            <strong className="mono text-volt">
              ₱{((entry?.paid_minor || 0) / 100).toFixed(2)}
            </strong>
            <p>100% minor units settled</p>
          </div>
        </div>
      </div>

      {/* 4-Vector Readiness Inspection Dashboard */}
      <div className="dashboard-columns">
        <section className="panel">
          <div className="panel-heading">
            <h2>Authoritative Readiness Vectors</h2>
            <span className="mono">{readiness?.is_ready ? "4/4 READY" : "ACTION REQUIRED"}</span>
          </div>

          {/* 1. Roster */}
          <div className="readiness-row">
            <span className={`check-disc ${readiness?.roster_ready ? "complete" : ""}`} aria-hidden="true">
              {readiness?.roster_ready ? "✓" : "!"}
            </span>
            <div>
              <strong>1. Roster Headcount Bounds</strong>
              <p>
                {readiness?.roster_count} dancers selected (Allowed range: {readiness?.min_required}–{readiness?.max_allowed})
              </p>
            </div>
            <Link href={`/app/entries/${entryId}/roster`} className="button button-outline text-xs">
              Edit Roster <Arrow />
            </Link>
          </div>

          {/* 2. Music */}
          <div className="readiness-row">
            <span className={`check-disc ${readiness?.music_ready ? "complete" : ""}`} aria-hidden="true">
              {readiness?.music_ready ? "✓" : "!"}
            </span>
            <div>
              <strong>2. Audio Performance Track</strong>
              <p>
                {entry?.track_filename ? `${entry.track_filename} (${entry.track_duration_secs}s)` : "Missing performance audio file"}
              </p>
            </div>
            <span className={`text-xs mono font-bold ${readiness?.music_ready ? "text-volt" : "text-amber-400"}`}>
              {readiness?.music_ready ? "COMPLIANT" : "UPLOAD"}
            </span>
          </div>

          {/* 3. Minor Guardian Consent */}
          <div className="readiness-row">
            <span className={`check-disc ${readiness?.consent_ready ? "complete" : ""}`} aria-hidden="true">
              {readiness?.consent_ready ? "✓" : "!"}
            </span>
            <div>
              <strong>3. Minor Dancer Guardian Waivers</strong>
              <p>
                {readiness?.consent_ready
                  ? "All minor dancers have verified guardian consent forms on file"
                  : "One or more minors pending guardian waiver verification"}
              </p>
            </div>
            <span className={`text-xs mono font-bold ${readiness?.consent_ready ? "text-volt" : "text-amber-400"}`}>
              {readiness?.consent_ready ? "VERIFIED" : "PENDING"}
            </span>
          </div>

          {/* 4. Payment */}
          <div className="readiness-row">
            <span className={`check-disc ${readiness?.payment_ready ? "complete" : ""}`} aria-hidden="true">
              {readiness?.payment_ready ? "✓" : "!"}
            </span>
            <div>
              <strong>4. Registration Fee Minor Unit Ledger</strong>
              <p>
                {readiness?.payment_ready
                  ? "Full entry fee paid and reconciled in ledger"
                  : "Outstanding balance required prior to stage call"}
              </p>
            </div>
            <span className={`text-xs mono font-bold ${readiness?.payment_ready ? "text-volt" : "text-amber-400"}`}>
              {readiness?.payment_ready ? "PAID" : "UNPAID"}
            </span>
          </div>

          {readiness?.diagnostics && readiness.diagnostics.length > 0 && (
            <div className="mt-4 p-3 bg-tungsten rounded border border-amber-500">
              <strong className="text-amber-400 text-xs block mb-1">Correction Required:</strong>
              <ul className="text-xs text-titanium list-disc list-inside space-y-1">
                {readiness.diagnostics.map((diag, i) => (
                  <li key={i}>{diag}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Stage & Lineup Metadata */}
        <aside className="event-mini">
          <span className="eyebrow">Stage Call & Schedule</span>
          <div className="mini-date">
            <strong>18</strong>
            <span>JUL<br />2027</span>
          </div>
          <h2>Manila Session 2027</h2>
          <p>Main Auditorium · Division: {entry?.division_id.toUpperCase()}</p>
          <div className="mini-event-divider" />
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-titanium">Check-in:</span>
              <strong className="text-chrome mono">09:00 AM PHT</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-titanium">Stage Rehearsal:</span>
              <strong className="text-chrome mono">10:30 AM PHT</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-titanium">Judged Session:</span>
              <strong className="text-volt mono">01:45 PM PHT</strong>
            </div>
          </div>
          <div className="mini-event-divider" />
          <Link href={`/app/entries/${entryId}/review`} className="button button-outline w-full text-center">
            Review Submission Details <Arrow diagonal />
          </Link>
        </aside>
      </div>

      {/* Roster Snapshot */}
      <section className="panel roster-panel mt-6">
        <div className="panel-heading">
          <div>
            <h2>Selected Performance Roster Snapshot</h2>
            <p>{entry?.roster.length} registered dancers bound to this entry</p>
          </div>
          <Link href={`/app/entries/${entryId}/roster`} className="button button-outline">
            Modify Selection <Arrow />
          </Link>
        </div>
        <div className="roster-table">
          <div className="roster-header">
            <span>Dancer</span>
            <span>Role</span>
            <span>Status</span>
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
              <Status tone={m.is_minor ? (m.consent_verified ? "volt" : "amber") : "volt"}>
                {m.is_minor ? (m.consent_verified ? "Minor (Consent OK)" : "Minor (Consent Req)") : "Adult (OK)"}
              </Status>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}