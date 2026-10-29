"use client";

import Link from "next/link";
import { useState } from "react";
import { Arrow, Brand } from "@/components/ui";

export default function OnboardingPage() {
  const [alias, setAlias] = useState("");
  const [birthYear, setBirthYear] = useState("2004");
  const [discipline, setDiscipline] = useState("Hip Hop / Street");
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
  }

  if (saved) {
    return (
      <div className="system-page">
        <Brand />
        <div style={{ maxWidth: 460, width: "100%", marginTop: 24 }}>
          <span className="check-disc complete" style={{ width: 44, height: 44, fontSize: 18, marginBottom: 18 }}>✓</span>
          <p className="eyebrow" style={{ color: "var(--accent-volt)" }}>Profile Configured</p>
          <h1 style={{ fontSize: "clamp(32px, 4vw, 48px)", margin: "8px 0 16px" }}>Ready to Step Up</h1>
          <p className="muted" style={{ lineHeight: 1.8, marginBottom: 28 }}>
            Your dancer profile <strong>{alias || "Dancer"}</strong> has been established. You can now join crews, enter battles, or create an entry.
          </p>
          <Link href="/workspaces" className="button button-volt">
            Choose your workspace <Arrow />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="system-page">
      <Brand />
      <div style={{ maxWidth: 460, width: "100%", marginTop: 24 }}>
        <p className="eyebrow">Profile Onboarding · P1</p>
        <h1 style={{ fontSize: "clamp(32px, 4vw, 48px)", margin: "8px 0 16px" }}>Your Dancer Identity</h1>
        <p className="muted" style={{ marginBottom: 24 }}>
          Tell the battlegrounds who is stepping onto the stage.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label htmlFor="alias" style={{ display: "block", fontSize: 12, marginBottom: 6 }}>
              Dancer / Stage alias
            </label>
            <input
              id="alias"
              type="text"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="e.g. B-Boy Kinetic"
            />
          </div>

          <div>
            <label htmlFor="birthYear" style={{ display: "block", fontSize: 12, marginBottom: 6 }}>
              Birth year (for division age validation)
            </label>
            <input
              id="birthYear"
              type="number"
              min={1970}
              max={2022}
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="discipline" style={{ display: "block", fontSize: 12, marginBottom: 6 }}>
              Primary dance style / discipline
            </label>
            <select id="discipline" value={discipline} onChange={(e) => setDiscipline(e.target.value)}>
              <option>Hip Hop / Street</option>
              <option>Breaking</option>
              <option>Popping / Locking</option>
              <option>Krump</option>
              <option>Waacking / Voguing</option>
              <option>All Styles / Fusion</option>
            </select>
          </div>

          <button type="submit" className="button button-volt" style={{ marginTop: 12 }}>
            Complete profile <Arrow />
          </button>
        </form>
      </div>
    </div>
  );
}
