"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Arrow, Brand, Status } from "@/components/ui";

export default function InviteAcceptancePage() {
  const params = useParams();
  const token = typeof params.token === "string" ? params.token : "inv-sample";
  const [name, setName] = useState("");
  const [isMinor, setIsMinor] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  function handleAccept(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your name to join the crew.");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="system-page">
        <Brand />
        <div style={{ maxWidth: 460, width: "100%", marginTop: 24 }}>
          <span className="check-disc complete" style={{ width: 44, height: 44, fontSize: 18, marginBottom: 18 }}>✓</span>
          <p className="eyebrow" style={{ color: "var(--accent-volt)" }}>Invitation Accepted</p>
          <h1 style={{ fontSize: "clamp(32px, 4vw, 48px)", margin: "8px 0 16px" }}>You&apos;re On the Roster</h1>
          <p className="muted" style={{ lineHeight: 1.8, marginBottom: 28 }}>
            <strong>{name}</strong> is now registered under <strong>A-Team Manila</strong>. {isMinor ? "Because you are under 18, a parental/guardian consent form has been requested." : "Your profile is verified for upcoming competition entries."}
          </p>
          <Link href="/app/crews" className="button button-volt">
            View your crew workspace <Arrow />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="system-page">
      <Brand />
      <div style={{ maxWidth: 480, width: "100%", marginTop: 24 }}>
        <p className="eyebrow">Crew Invitation · P1</p>
        <h1 style={{ fontSize: "clamp(32px, 4vw, 48px)", margin: "8px 0 16px" }}>Join the Crew</h1>
        
        <div style={{ padding: "20px 24px", background: "var(--bg-carbon)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius)", marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 11, color: "var(--text-titanium)" }}>Invited by Marcus Santos</span>
            <Status tone="volt">Philippines</Status>
          </div>
          <h2 style={{ fontSize: 24, fontFamily: "var(--font-sans)", fontWeight: 550, margin: "6px 0" }}>
            A-Team Manila
          </h2>
          <p style={{ color: "var(--text-titanium)", fontSize: 12 }}>
            Open Crew & Monster Crew · Manila Session 2027
          </p>
        </div>

        {error && <div className="form-error" role="alert">{error}</div>}

        <form onSubmit={handleAccept} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label htmlFor="dancerName" style={{ display: "block", fontSize: 12, marginBottom: 6 }}>
              Your full name (as shown on official ID)
            </label>
            <input
              id="dancerName"
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              placeholder="e.g. Carlos Dance"
            />
          </div>

          <label style={{ display: "flex", gap: 10, alignItems: "start", fontSize: 12, color: "var(--text-titanium)", cursor: "pointer", marginTop: 4 }}>
            <input
              type="checkbox"
              checked={isMinor}
              onChange={(e) => setIsMinor(e.target.checked)}
              style={{ width: "auto", minHeight: 0, marginTop: 3 }}
            />
            <span>
              I am under 18 years of age (requires parental / guardian consent form)
            </span>
          </label>

          <p className="fineprint" style={{ margin: 0 }}>
            Invitation token: <span className="mono" style={{ color: "var(--text-chrome)" }}>{token}</span> (expires in 7 days).
          </p>

          <button type="submit" className="button button-volt" style={{ marginTop: 12 }}>
            Accept invitation & join roster <Arrow />
          </button>
        </form>
      </div>
    </div>
  );
}
