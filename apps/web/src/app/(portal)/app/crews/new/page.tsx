"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Arrow, PageHeading } from "@/components/ui";

export default function NewCrewPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [city, setCity] = useState("Manila");
  const [chapter, setChapter] = useState("ph");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please specify your crew's name.");
      return;
    }
    setLoading(true);
    // Simulating crew creation or routing to crew management
    setTimeout(() => {
      router.push("/app");
    }, 400);
  }

  return (
    <main id="main-content" className="workspace-main">
      <PageHeading
        eyebrow="Crew Management · P1"
        title="Register New Crew"
        description="Establish your crew's identity for upcoming regional and world championship entries."
      />

      <div style={{ maxWidth: 640 }}>
        {error && <div className="form-error" role="alert">{error}</div>}

        <form onSubmit={handleSubmit} className="panel" style={{ padding: 32, display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <label htmlFor="crewName" style={{ display: "block", fontSize: 12, marginBottom: 6 }}>
              Crew name <span className="required-label">Required</span>
            </label>
            <input
              id="crewName"
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              placeholder="e.g. Philippine Allstars Junior"
            />
          </div>

          <div>
            <label htmlFor="city" style={{ display: "block", fontSize: 12, marginBottom: 6 }}>
              Home city / region
            </label>
            <input
              id="city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Quezon City"
            />
          </div>

          <div>
            <label htmlFor="chapter" style={{ display: "block", fontSize: 12, marginBottom: 6 }}>
              Chapter territory
            </label>
            <select id="chapter" value={chapter} onChange={(e) => setChapter(e.target.value)}>
              <option value="ph">WSB Philippines</option>
              <option value="hk">WSB Hong Kong</option>
              <option value="au">WSB Australia</option>
              <option value="nz">WSB New Zealand</option>
            </select>
            <p className="field-help">
              Your crew will qualify through this chapter&apos;s regional sessions.
            </p>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-subtle)", paddingTop: 20, marginTop: 10 }}>
            <Link href="/app" className="text-link" style={{ fontSize: 12 }}>
              Cancel
            </Link>
            <button type="submit" disabled={loading} className="button button-volt">
              {loading ? "Creating..." : "Establish crew"} <Arrow />
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
