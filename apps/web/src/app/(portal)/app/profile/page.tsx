"use client";

import { useState } from "react";
import { Arrow, PageHeading } from "@/components/ui";

export default function ProfilePage() {
  const [name, setName] = useState("Marcus Santos");
  const [alias, setAlias] = useState("B-Boy Kinetic");
  const [email, setEmail] = useState("marcus@ateam-ph.com");
  const [phone, setPhone] = useState("+63 917 555 0192");
  const [saved, setSaved] = useState(false);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <main id="main-content" className="workspace-main">
      <PageHeading
        eyebrow="Account Settings · P1"
        title="Dancer Profile"
        description="Your personal information, stage identity, and contact details across WSB."
      />

      {saved && (
        <div className="info-note" style={{ color: "var(--accent-volt)", borderColor: "var(--border-active)", marginBottom: 20 }}>
          Profile changes saved successfully.
        </div>
      )}

      <div style={{ maxWidth: 640 }}>
        <form onSubmit={handleSave} className="panel" style={{ padding: 32, display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <label htmlFor="name" style={{ display: "block", fontSize: 12, marginBottom: 6 }}>
              Full legal name (verified against ID)
            </label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <label htmlFor="alias" style={{ display: "block", fontSize: 12, marginBottom: 6 }}>
              Dancer / Stage alias
            </label>
            <input id="alias" value={alias} onChange={(e) => setAlias(e.target.value)} />
          </div>

          <div>
            <label htmlFor="email" style={{ display: "block", fontSize: 12, marginBottom: 6 }}>
              Email address
            </label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div>
            <label htmlFor="phone" style={{ display: "block", fontSize: 12, marginBottom: 6 }}>
              Contact phone number
            </label>
            <input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>

          <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "var(--text-titanium)" }}>Chapter: WSB Philippines</span>
            <button type="submit" className="button button-volt">
              Save changes <Arrow />
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
