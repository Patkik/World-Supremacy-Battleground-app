"use client";

import Link from "next/link";
import { useState } from "react";
import { Arrow, Brand, Status } from "@/components/ui";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [persona, setPersona] = useState<string | null>(null);

  const personas = [
    { role: "crew_manager", name: "Marcus Santos", title: "Crew Leader · A-Team Manila", path: "/app" },
    { role: "dancer", name: "Carlos Dance", title: "Dancer · Open Division", path: "/app/crews" },
    { role: "registrar", name: "Elena Cruz", title: "Registrar · WSB Philippines", path: "/admin/ph" },
    { role: "judge", name: "Hiro Tanaka", title: "International Judge", path: "/console/demo/judge" },
  ];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setNotice("Please fill in both your email and password.");
      return;
    }
    setNotice("Connecting to Firebase Auth... If you are testing locally, choose a quick persona below.");
  }

  return (
    <div className="system-page">
      <Brand />
      <div style={{ maxWidth: 460, width: "100%", marginTop: 24 }}>
        <p className="eyebrow">Identity & Access · P1</p>
        <h1 style={{ fontSize: "clamp(32px, 4vw, 48px)", margin: "8px 0 16px" }}>Sign In</h1>
        <p className="muted" style={{ marginBottom: 28 }}>
          Access your dancer dashboard, manage crews, or review event operations.
        </p>

        {notice && <div className="form-error" role="alert">{notice}</div>}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label htmlFor="email" style={{ display: "block", fontSize: 12, marginBottom: 6 }}>
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="dancer@example.com"
            />
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <label htmlFor="password" style={{ fontSize: 12 }}>Password</label>
              <Link href="/forgot-password" className="text-link" style={{ fontSize: 11, minHeight: 0 }}>
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
            />
          </div>

          <button type="submit" className="button button-volt" style={{ marginTop: 12 }}>
            Sign in to WSB <Arrow />
          </button>
        </form>

        <div style={{ margin: "32px 0 24px", borderTop: "1px solid var(--border-subtle)", paddingTop: 24 }}>
          <p className="eyebrow" style={{ color: "var(--accent-volt)" }}>Development Persona Switch</p>
          <p className="fineprint" style={{ marginBottom: 14 }}>
            Explore different role-scoped surfaces with pre-configured synthetic credentials:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {personas.map((p) => (
              <Link
                key={p.role}
                href={p.path}
                onClick={() => setPersona(p.name)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 16px",
                  background: persona === p.name ? "var(--bg-carbon)" : "var(--bg-tungsten)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius)",
                  fontSize: 12,
                }}
              >
                <div>
                  <strong>{p.name}</strong>
                  <span style={{ display: "block", color: "var(--text-titanium)", fontSize: 10, marginTop: 2 }}>
                    {p.title}
                  </span>
                </div>
                <Status tone="volt">{p.role}</Status>
              </Link>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-titanium)" }}>
          <span>Don&apos;t have an account?</span>
          <Link href="/sign-up" className="text-link" style={{ minHeight: 0 }}>
            Create account <Arrow diagonal />
          </Link>
        </div>
      </div>
    </div>
  );
}
