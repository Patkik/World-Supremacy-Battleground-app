"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status } from "@/components/ui";
import { fetchCrew, createInvitation, Crew, CrewMember } from "@/lib/api";

export default function CrewRosterPage({
  params,
}: {
  params: Promise<{ crewId: string }>;
}) {
  const { crewId } = use(params);
  const [crew, setCrew] = useState<Crew | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchCrew("ph", crewId, "demo-token");
        setCrew(data);
      } catch {
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

  async function handleCreateInvite() {
    try {
      const inv = await createInvitation("ph", "demo-token", crewId);
      setInviteToken(inv.token);
      setFeedback("Invitation token created. Share the link with your dancer.");
    } catch {
      const mockToken = `inv-${crewId}-${Date.now().toString().slice(-4)}`;
      setInviteToken(mockToken);
      setFeedback("Demonstration invitation link ready.");
    }
  }

  function handleCopy() {
    if (!inviteToken) return;
    const url = `${window.location.origin}/invite/${inviteToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <main className="workspace-main">
        <PageHeading eyebrow="Crew Roster" title="Loading roster..." description="Retrieving crew members." />
      </main>
    );
  }

  return (
    <main id="main-content" className="workspace-main">
      <PageHeading
        eyebrow={`${crew?.name || "Crew"} / Management`}
        title="Roster & Invitations"
        description="Review all registered dancers, verify minor guardian consent statuses, and invite new members."
        action={
          <div className="flex gap-2">
            <Link href={`/app/crews/${crewId}`} className="button button-outline">
              ← Overview
            </Link>
            <button onClick={handleCreateInvite} className="button button-volt">
              + Invite Dancer
            </button>
          </div>
        }
      />

      {feedback && <p className="info-note" role="status">{feedback}</p>}

      {inviteToken && (
        <section className="panel mb-6" style={{ border: "1px solid var(--accent-volt)" }}>
          <div className="panel-heading">
            <div>
              <Status tone="volt">Active Invitation Token</Status>
              <h2 className="text-lg mt-1">Ready to share</h2>
            </div>
            <button onClick={handleCopy} className="button button-volt">
              {copied ? "Copied to Clipboard!" : "Copy Full URL"}
            </button>
          </div>
          <p className="text-titanium text-sm mb-2">
            Send this one-time link directly to your dancer. The link will expire in 7 days:
          </p>
          <code className="mono block p-3 bg-tungsten rounded text-volt text-sm">
            {typeof window !== "undefined" ? `${window.location.origin}/invite/${inviteToken}` : `/invite/${inviteToken}`}
          </code>
        </section>
      )}

      {/* Roster List Table */}
      <section className="panel roster-panel">
        <div className="panel-heading">
          <div>
            <h2>Verified Crew Members</h2>
            <p>{crew?.members.length} total dancers registered under this crew</p>
          </div>
          <span className="mono text-volt font-bold">{crew?.members.length} Dancers</span>
        </div>

        <div className="roster-table">
          <div className="roster-header">
            <span># & Name</span>
            <span>Role</span>
            <span>Minor Status</span>
            <span>Guardian Consent</span>
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
              <span>
                {m.is_minor ? (
                  <span className="text-amber-400 font-mono text-sm">Minor (14&U)</span>
                ) : (
                  <span className="text-titanium text-sm">Adult (18+)</span>
                )}
              </span>
              <Status tone={m.is_minor ? (m.consent_verified ? "volt" : "amber") : "volt"}>
                {m.is_minor ? (m.consent_verified ? "Waiver Signed" : "Pending Guardian") : "Self-Signed"}
              </Status>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6 p-4 rounded bg-carbon border border-subtle">
        <h3 className="font-bold text-chrome text-sm mb-1">Official WSB Division Capacity Rules</h3>
        <p className="text-xs text-titanium leading-relaxed">
          Open Crew: 5 to 14 dancers. Monster Crew: 20 to 40 dancers. Varsity Ignite: 5 to 18 dancers (14 & under).
          Submitting an entry with minors requires signed guardian waivers verified by the Chapter Registrar before stage call.
        </p>
      </div>
    </main>
  );
}