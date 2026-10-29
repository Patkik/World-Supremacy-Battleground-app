import Link from "next/link";
import { Arrow, Brand, Status } from "@/components/ui";

export default function WorkspacesPage() {
  const workspaces = [
    {
      title: "Crew Management Workspace",
      role: "Crew Manager",
      description: "Assemble rosters, generate invite links, manage divisions, and submit event entries.",
      path: "/app",
      tone: "volt" as const,
    },
    {
      title: "My Crews & Roster",
      role: "Dancer / Participant",
      description: "Review your crew memberships, check your eligibility status, and view battle entries.",
      path: "/app/crews",
      tone: "neutral" as const,
    },
    {
      title: "Chapter Administration",
      role: "Registrar / Director",
      description: "Review incoming crew registrations, verify minor consent documents, and manage event schedules.",
      path: "/admin/ph",
      tone: "amber" as const,
    },
    {
      title: "Tactical Judge Desk",
      role: "International Judge",
      description: "Offline-capable 100-point scoring console with criteria sliders, notes, and outbox sync.",
      path: "/console/demo/judge",
      tone: "volt" as const,
    },
    {
      title: "Broadcast Arena Live HUD",
      role: "Stadium Display",
      description: "High-contrast LED wall projection showing live battles, on-deck crews, and score reveals.",
      path: "/arena-live/demo",
      tone: "neutral" as const,
    },
  ];

  return (
    <div className="system-page">
      <Brand />
      <div style={{ maxWidth: 640, width: "100%", marginTop: 24 }}>
        <p className="eyebrow">Workspace Chooser · P1</p>
        <h1 style={{ fontSize: "clamp(34px, 4vw, 52px)", margin: "8px 0 16px" }}>Select Your Station</h1>
        <p className="muted" style={{ lineHeight: 1.8, marginBottom: 28 }}>
          Your account holds credentials across multiple roles. Select the workspace you wish to operate in today.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {workspaces.map((w) => (
            <Link
              key={w.path}
              href={w.path}
              style={{
                display: "block",
                padding: "20px 24px",
                background: "var(--bg-carbon)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius)",
                transition: "border-color 0.2s, background 0.2s",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <Status tone={w.tone}>{w.role}</Status>
                <Arrow diagonal />
              </div>
              <h2 style={{ fontSize: 20, fontFamily: "var(--font-sans)", fontWeight: 550, margin: "6px 0" }}>
                {w.title}
              </h2>
              <p style={{ color: "var(--text-titanium)", fontSize: 13, lineHeight: 1.6 }}>
                {w.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
