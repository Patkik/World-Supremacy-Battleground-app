"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status } from "@/components/ui";
import { getEntryDetail, updateEntryRoster, fetchCrew, Entry, CrewMember } from "@/lib/api";

export default function EntryRosterSelectionPage({
  params,
}: {
  params: Promise<{ entryId: string }>;
}) {
  const { entryId } = use(params);
  const [entry, setEntry] = useState<Entry | null>(null);
  const [availableDancers, setAvailableDancers] = useState<CrewMember[]>([]);
  const [selectedUids, setSelectedUids] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const detail = await getEntryDetail("ph", "demo-token", "manila-session-2027", entryId);
        setEntry(detail.entry);
        const currentUids = new Set(detail.entry.roster.map((m) => m.uid));
        setSelectedUids(currentUids);

        // Fetch crew to get all available dancers
        const crewData = await fetchCrew("ph", detail.entry.crew_id, "demo-token");
        setAvailableDancers(crewData.members);
      } catch {
        // Fallback demo dataset
        const fallbackMembers: CrewMember[] = [
          { uid: "dev-manager-1", name: "Kenji Ramos (Manager)", role: "Manager", is_minor: false, consent_verified: true },
          { uid: "dancer-1", name: "Jolo Santos", role: "Dancer", is_minor: false, consent_verified: true },
          { uid: "dancer-2", name: "Bea dela Cruz", role: "Dancer", is_minor: false, consent_verified: true },
          { uid: "dancer-3", name: "Mateo Tan", role: "Dancer", is_minor: false, consent_verified: true },
          { uid: "dancer-4", name: "Ria Reyes", role: "Dancer", is_minor: false, consent_verified: true },
          { uid: "dancer-5", name: "Carlo Lim", role: "Dancer", is_minor: true, consent_verified: true },
          { uid: "dancer-6", name: "Samantha Lee", role: "Dancer", is_minor: false, consent_verified: true },
          { uid: "dancer-7", name: "David Bautista", role: "Dancer", is_minor: false, consent_verified: true },
        ];
        setAvailableDancers(fallbackMembers);
        setSelectedUids(new Set(fallbackMembers.slice(0, 6).map((m) => m.uid)));
        setEntry({
          id: entryId,
          chapter_id: "ph",
          event_id: "manila-session-2027",
          crew_id: "crew-afterhours",
          division_id: "open-crew",
          roster: fallbackMembers.slice(0, 6),
          paid_minor: 720000,
          status: "draft",
          created_at: 1700000000,
          updated_at: 1700000000,
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [entryId]);

  function toggleDancer(dancer: CrewMember) {
    const next = new Set(selectedUids);
    if (next.has(dancer.uid)) {
      next.delete(dancer.uid);
    } else {
      next.add(dancer.uid);
    }
    setSelectedUids(next);
  }

  async function handleSaveRoster() {
    if (!entry) return;
    setSaving(true);
    setFeedback(null);
    const newRoster = availableDancers.filter((d) => selectedUids.has(d.uid));
    try {
      const updated = await updateEntryRoster("ph", "demo-token", entry.event_id, entry.id, newRoster);
      setEntry(updated);
      setFeedback("Entry roster snapshot saved successfully.");
    } catch {
      setEntry({ ...entry, roster: newRoster });
      setFeedback("Entry roster updated in browser session.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="workspace-main">
        <PageHeading eyebrow="Roster Selection" title="Loading dancers..." description="Retrieving crew members." />
      </main>
    );
  }

  const selectedCount = selectedUids.size;
  const isBoundsValid = selectedCount >= 5 && selectedCount <= 14;

  return (
    <main id="main-content" className="workspace-main">
      <PageHeading
        eyebrow={`Entry #${entryId} / Manila Session 2027`}
        title="Roster Snapshot Selection"
        description="Select dancers from your crew roster to perform in this division. Headcount must meet division bounds (5–14 dancers for Open Crew)."
        action={
          <div className="flex gap-2">
            <Link href={`/app/entries/${entryId}`} className="button button-outline">
              ← Entry Overview
            </Link>
            <button
              onClick={handleSaveRoster}
              disabled={saving || !isBoundsValid}
              className="button button-volt"
            >
              {saving ? "Saving Snapshot..." : "Save Selection"} <Arrow />
            </button>
          </div>
        }
      />

      {feedback && <p className="info-note" role="status">{feedback}</p>}

      {/* Headcount Compliance Counter */}
      <div className="p-4 rounded bg-carbon border border-subtle mb-6 flex justify-between items-center">
        <div>
          <span className="text-xs text-titanium block mb-1">Selected Headcount:</span>
          <strong className={`text-2xl mono ${isBoundsValid ? "text-volt" : "text-amber-400"}`}>
            {selectedCount} <small className="text-titanium text-sm">/ 14 max</small>
          </strong>
        </div>
        <div>
          <Status tone={isBoundsValid ? "volt" : "amber"}>
            {isBoundsValid ? "Within Bounds (5–14)" : selectedCount < 5 ? `Need ${5 - selectedCount} more dancers` : `Exceeds max by ${selectedCount - 14}`}
          </Status>
        </div>
      </div>

      {/* Dancers Selection List */}
      <section className="panel roster-panel">
        <div className="panel-heading">
          <div>
            <h2>Available Crew Roster</h2>
            <p>Click checkboxes to include or exclude dancers from this entry</p>
          </div>
        </div>

        <div className="roster-table">
          <div className="roster-header">
            <span>Include</span>
            <span>Dancer Name</span>
            <span>Role</span>
            <span>Consent Verified</span>
          </div>
          {availableDancers.map((d) => {
            const isSelected = selectedUids.has(d.uid);
            return (
              <div
                key={d.uid}
                onClick={() => toggleDancer(d)}
                className={`roster-record cursor-pointer transition-colors ${
                  isSelected ? "bg-tungsten/50" : "opacity-60"
                }`}
                style={{ cursor: "pointer" }}
              >
                <div>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleDancer(d)}
                    className="mr-3 h-5 w-5 accent-volt cursor-pointer"
                  />
                  <strong>{d.name}</strong>
                </div>
                <span className="muted">{d.role}</span>
                <span className="text-titanium text-sm">
                  {d.is_minor ? "Minor (Guardian Consent)" : "Adult (Self)"}
                </span>
                <Status tone={d.consent_verified ? "volt" : "amber"}>
                  {d.consent_verified ? "Verified" : "Pending"}
                </Status>
              </div>
            );
          })}
        </div>
      </section>

      <div className="mt-6 flex justify-between items-center">
        <span className="text-xs text-titanium">
          Saving creates a locked snapshot for stage scheduling upon final submission.
        </span>
        <button
          onClick={handleSaveRoster}
          disabled={saving || !isBoundsValid}
          className="button button-volt"
        >
          {saving ? "Saving Snapshot..." : "Save Selection"} <Arrow />
        </button>
      </div>
    </main>
  );
}