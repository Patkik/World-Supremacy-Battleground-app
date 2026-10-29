"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status } from "@/components/ui";
import { fetchCrew, createInvitation, Crew, CrewMember } from "@/lib/api";

export default function CrewWorkspacePage({
  params,
}: {
  params: Promise<{ crewId: string }>;
}) {
  const { crewId } = use(params);
  const [crew, setCrew] = useState<Crew | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    // Attempt to load from API or fallback to seeded data
    async function load() {
      try {
        const data = await fetchCrew("ph", crewId, "demo-token");
        setCrew(data);
      } catch {
        // Fallback default crew
        setCrew({
          id: crewId,
          chapter_id: "ph",
          name: "Afterhours Collective",
          city: "Manila",
          manager_uid: "dev-manager-1",
          members: [
            { uid: "dev-manager-1", name: "Kenji Ramos (Manager)", role: "Manager", is_minor: false, consent_verified: true },
            { uid: "dancer-1", name: "Jolo Santos", role: "Dancer", is_minor: false, consent_verified: true },
            { uid: "dancer-2", name: "Bea dela Cruz", role: "Dancer", is_minor: false, consent_verified: true },
            { uid: "dancer-3", name: "Mateo Tan", role: "Dancer", is_minor: false, consent_verified: true },
            { uid: "dancer-4", name: "Ria Reyes", role: "Dancer", is_minor: false, consent_verified: true },
            { uid: "dancer-5", name: "Carlo Lim", role: "Dancer", is_minor: true, consent_verified: true },
          ],
          created_at: 1700000000,
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [crewId]);

  async function handleGenerateInvite() {
    try {
      const inv = await createInvitation("ph", "demo-token", crewId);
      setInviteToken(inv.token);
      setMessage("New dancer invitation link generated.");
    } catch {
      // Deterministic demo token
      const mockToken = `inv-${crewId}-${Date.now().toString().slice(-4)}`;
      setInviteToken(mockToken);
      setMessage("Demonstration invitation link generated.");
    }
  }

  function handleCopy() {
    if (!inviteToken) return;
    const url = `${window.location.origin}/invite/${inviteToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  if (loading) {
    return (
      <main className="workspace-main">
        <PageHeading eyebrow="Crew Workspace" title="Loading crew..." description="Retrieving crew roster and registered entries." />
      </main>
    );
  }

  return (
    <main id="main-content" className="workspace-main">
      <PageHeading
        eyebrow={`Chapter Philippines / Crew #${crewId}`}
        title={crew?.name || "Crew Workspace"}
        description={`${crew?.city || "Manila"}, Philippines · Official Crew Identity`}
        action={
          <div className="flex gap-2">
            <Link href={`/app/crews/${crewId}/roster`} className="button button-outline">
              Manage Roster <Arrow />
            </Link>
            <Link href={`/app/register/manila-session-2027`} className="button button-volt">
              Register for Event <Arrow diagonal />
            </Link>
          </div>
        }
      />

      {message && <p className="info-note" role="status">{message}</p>}

      {/* Subnavigation */}
      <div className="tabs mb-6" style={{ display: "flex", gap: "1rem", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "0.75rem" }}>
        <Link href={`/app/crews/${crewId}`} className="text-chrome font-bold" style={{ color: "var(--accent-volt)" }}>
          Overview
        </Link>
        <Link href={`/app/crews/${crewId}/roster`} className="text-titanium hover:text-chrome">
          Roster & Invitations ({crew?.members.length || 0})
        </Link>
        <Link href={`/app/crews/${crewId}/settings`} className="text-titanium hover:text-chrome">
          Crew Settings
        </Link>
      </div>

      <div className="crew-overview">
        <div className="crew-banner">
          <div>
            <Status tone="volt">Verified Crew Identity</Status>
            <h2>{crew?.name}</h2>
            <p>{crew?.city}, Philippines <span> / </span> Manager: Kenji Ramos</p>
          </div>
          <div className="crew-monogram" aria-hidden="true">
            {crew?.name.slice(0, 2).toUpperCase() || "AC"}
            <span>CREW</span>
          </div>
        </div>

        <div className="crew-summary">
          <div>
            <span>Active Roster</span>
            <strong className="mono">{String(crew?.members.length || 0).padStart(2, "0")} <small>dancers</small></strong>
          </div>
          <div>
            <span>Division Eligibility</span>
            <strong className="text-volt">Open Crew & Varsity</strong>
            <p>5–14 dancer division ready</p>
          </div>
        </div>
      </div>

      <div className="dashboard-columns">
        {/* Active Entries */}
        <section className="panel">
          <div className="panel-heading">
            <h2>Championship Entries</h2>
            <span className="mono">1 Active</span>
          </div>
          <div className="readiness-row">
            <span className="check-disc complete" aria-hidden="true">✓</span>
            <div>
              <strong>Manila Session 2027 · Open Crew</strong>
              <p>Entry #entry-manila-open-1 · Submitted & Under Registrar Review</p>
            </div>
            <Link href="/app/entries/entry-manila-open-1" className="button button-outline" aria-label="View entry status">
              View Status <Arrow />
            </Link>
          </div>
          <div className="readiness-row">
            <span className="check-disc" aria-hidden="true">+</span>
            <div>
              <strong>Hong Kong World Championship 2027</strong>
              <p>Registration window open · 18–21 Nov 2027</p>
            </div>
            <Link href="/app/register/hk-championship-2027" className="text-link">
              Enter Crew <Arrow diagonal />
            </Link>
          </div>
        </section>

        {/* Quick Dancer Invitation Generator */}
        <aside className="event-mini">
          <span className="eyebrow">Roster Expansion</span>
          <h2>Invite Dancer</h2>
          <p>Generate a secure, single-use token link for dancers to claim membership on this crew.</p>
          
          {inviteToken ? (
            <div className="mt-4 p-3 bg-tungsten rounded border border-subtle">
              <span className="text-xs text-titanium block mb-1">Invitation Link (Valid 7 days)</span>
              <code className="text-xs mono block break-all text-volt mb-2">
                {typeof window !== "undefined" ? `${window.location.origin}/invite/${inviteToken}` : `/invite/${inviteToken}`}
              </code>
              <button onClick={handleCopy} className="button button-volt w-full text-center">
                {copied ? "Copied Link!" : "Copy Link"}
              </button>
            </div>
          ) : (
            <button onClick={handleGenerateInvite} className="button button-volt mt-4 w-full">
              Generate Invite Link
            </button>
          )}

          <div className="mini-event-divider" />
          <p className="text-xs text-muted">Minors must submit guardian consent prior to entry confirmation.</p>
        </aside>
      </div>

      {/* Roster Preview */}
      <section className="panel roster-panel mt-6">
        <div className="panel-heading">
          <div>
            <h2>Current Roster Roster Snapshot</h2>
            <p>{crew?.members.length} registered dancers</p>
          </div>
          <Link href={`/app/crews/${crewId}/roster`} className="button button-outline">
            Full Roster & Invitations <Arrow />
          </Link>
        </div>
        <div className="roster-table">
          <div className="roster-header">
            <span>Dancer</span>
            <span>Role</span>
            <span>Consent & Age</span>
          </div>
          {crew?.members.map((m: CrewMember, idx: number) => (
            <div className="roster-record" key={m.uid}>
              <div>
                <span className="roster-number mono" aria-hidden="true">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <strong>{m.name}</strong>
              </div>
              <span className="muted">{m.role}</span>
              <Status tone={m.is_minor ? (m.consent_verified ? "volt" : "amber") : "volt"}>
                {m.is_minor ? (m.consent_verified ? "Minor (Consent Verified)" : "Minor (Consent Pending)") : "Adult (Verified)"}
              </Status>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}