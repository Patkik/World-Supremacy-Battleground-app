"use client";

import { useState } from "react";
import { Arrow, PageHeading, Status } from "@/components/ui";

export default function SecurityPage() {
  const [sessions, setSessions] = useState([
    { id: "sess-1", device: "Chrome on macOS", location: "Quezon City, PH", current: true, time: "Active now" },
    { id: "sess-2", device: "Safari on iPhone 15", location: "Manila, PH", current: false, time: "2 hours ago" },
  ]);
  const [terminated, setTerminated] = useState(false);

  function terminateOther() {
    setSessions(sessions.filter((s) => s.current));
    setTerminated(true);
    setTimeout(() => setTerminated(false), 3000);
  }

  return (
    <main id="main-content" className="workspace-main">
      <PageHeading
        eyebrow="Security & Credentials · P1"
        title="Security & Active Sessions"
        description="Monitor active sign-in sessions, manage credentials, and review access privileges."
      />

      {terminated && (
        <div className="info-note" style={{ color: "var(--accent-volt)", borderColor: "var(--border-active)", marginBottom: 20 }}>
          All other sessions have been terminated.
        </div>
      )}

      <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 24 }}>
        <section className="panel" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, fontFamily: "var(--font-sans)", fontWeight: 550, marginBottom: 12 }}>
            Active Sessions
          </h2>
          <p style={{ color: "var(--text-titanium)", fontSize: 12, lineHeight: 1.7, marginBottom: 20 }}>
            These devices are currently authenticated to your WSB account. If you see an unrecognized device, terminate it immediately.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {sessions.map((s) => (
              <div
                key={s.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "16px 20px",
                  background: "var(--bg-tungsten)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius)",
                }}
              >
                <div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <strong style={{ fontSize: 13 }}>{s.device}</strong>
                    {s.current && <Status tone="volt">Current device</Status>}
                  </div>
                  <span style={{ fontSize: 11, color: "var(--text-titanium)", display: "block", marginTop: 4 }}>
                    {s.location} · {s.time}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {sessions.length > 1 && (
            <button
              onClick={terminateOther}
              className="button button-outline"
              style={{ marginTop: 20, fontSize: 12 }}
            >
              Sign out other sessions
            </button>
          )}
        </section>

        <section className="panel" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, fontFamily: "var(--font-sans)", fontWeight: 550, marginBottom: 8 }}>
            Change Password
          </h2>
          <p style={{ color: "var(--text-titanium)", fontSize: 12, marginBottom: 20 }}>
            Ensure your password is at least 8 characters long and contains a mix of letters and numbers.
          </p>
          <div style={{ display: "flex", gap: 16 }}>
            <input type="password" placeholder="Current password" style={{ maxWidth: 220 }} />
            <input type="password" placeholder="New password" style={{ maxWidth: 220 }} />
            <button className="button button-volt" style={{ fontSize: 11, padding: "12px 18px", minHeight: 0 }}>
              Update <Arrow />
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
