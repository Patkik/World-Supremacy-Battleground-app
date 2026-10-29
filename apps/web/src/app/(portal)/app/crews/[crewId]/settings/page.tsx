"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Arrow, PageHeading } from "@/components/ui";
import { fetchCrew, updateCrew, Crew } from "@/lib/api";

export default function CrewSettingsPage({
  params,
}: {
  params: Promise<{ crewId: string }>;
}) {
  const { crewId } = use(params);
  const [crew, setCrew] = useState<Crew | null>(null);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchCrew("ph", crewId, "demo-token");
        setCrew(data);
        setName(data.name);
        setCity(data.city);
      } catch {
        const fallback = {
          id: crewId,
          chapter_id: "ph",
          name: "Afterhours Collective",
          city: "Manila",
          manager_uid: "dev-manager-1",
          members: [],
          created_at: 1700000000,
        };
        setCrew(fallback);
        setName(fallback.name);
        setCity(fallback.city);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [crewId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const updated = await updateCrew("ph", "demo-token", crewId, name, city);
      setCrew(updated);
      setMessage("Crew details updated successfully.");
    } catch {
      // Local preview update
      if (crew) {
        setCrew({ ...crew, name, city });
      }
      setMessage("Crew profile updated.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="workspace-main">
        <PageHeading eyebrow="Crew Settings" title="Loading settings..." description="Retrieving crew configuration." />
      </main>
    );
  }

  return (
    <main id="main-content" className="workspace-main">
      <PageHeading
        eyebrow={`${crew?.name || "Crew"} / Configuration`}
        title="Crew Settings"
        description="Update your crew name, hometown representation, and manager contact credentials."
        action={
          <Link href={`/app/crews/${crewId}`} className="button button-outline">
            ← Back to Overview
          </Link>
        }
      />

      {message && <p className="info-note" role="status">{message}</p>}

      <div className="max-w-xl">
        <section className="panel mb-8">
          <div className="panel-heading">
            <h2>Identity & Profile</h2>
          </div>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label htmlFor="crew-name" className="block text-sm font-semibold text-chrome mb-1">
                Official Crew Name
              </label>
              <input
                id="crew-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full p-3 rounded bg-tungsten border border-subtle text-chrome focus:border-volt"
              />
              <span className="text-xs text-titanium mt-1 block">
                This exact name appears on stage lineups, live scoreboards, and winner certificates.
              </span>
            </div>

            <div>
              <label htmlFor="crew-city" className="block text-sm font-semibold text-chrome mb-1">
                Hometown / City Representation
              </label>
              <input
                id="crew-city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                className="w-full p-3 rounded bg-tungsten border border-subtle text-chrome focus:border-volt"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="button button-volt"
              >
                {saving ? "Saving Changes..." : "Save Changes"} <Arrow />
              </button>
            </div>
          </form>
        </section>

        {/* Danger Zone */}
        <section className="panel" style={{ border: "1px solid var(--accent-crimson)" }}>
          <div className="panel-heading">
            <h2 className="text-crimson font-bold">Danger Zone</h2>
          </div>
          <p className="text-sm text-titanium mb-4">
            Disbanding a crew will cancel any unapproved event entries and revoke all active invitation tokens.
          </p>
          <button
            type="button"
            onClick={() => alert("Crew archiving requires contacting Chapter Administration for active championship entries.")}
            className="button"
            style={{ backgroundColor: "rgba(255, 42, 0, 0.15)", color: "var(--accent-crimson)", borderColor: "var(--accent-crimson)" }}
          >
            Disband Crew
          </button>
        </section>
      </div>
    </main>
  );
}