"use client";

import Link from "next/link";
import { useState } from "react";
import { Arrow, Brand } from "@/components/ui";

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [chapter, setChapter] = useState("ph");
  const [agree, setAgree] = useState(false);
  const [notice, setNotice] = useState("");
  const [done, setDone] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !password) {
      setNotice("Please fill in all required fields.");
      return;
    }
    if (!agree) {
      setNotice("You must agree to the competition terms and code of conduct.");
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
          <p className="eyebrow" style={{ color: "var(--accent-volt)" }}>Account Created</p>
          <h1 style={{ fontSize: "clamp(32px, 4vw, 48px)", margin: "8px 0 16px" }}>Welcome to the Floor</h1>
          <p className="muted" style={{ lineHeight: 1.8, marginBottom: 28 }}>
            An activation link has been sent to <strong>{email}</strong>. Check your inbox to verify your address and continue to your dashboard.
          </p>
          <Link href="/app" className="button button-volt">
            Continue to personal dashboard <Arrow />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="system-page">
      <Brand />
      <div style={{ maxWidth: 460, width: "100%", marginTop: 24 }}>
        <p className="eyebrow">Identity & Access · P1</p>
        <h1 style={{ fontSize: "clamp(32px, 4vw, 48px)", margin: "8px 0 16px" }}>Create Account</h1>
        <p className="muted" style={{ marginBottom: 24 }}>
          Register to represent your crew, compete in battles, or join WSB chapters worldwide.
        </p>

        {notice && <div className="form-error" role="alert">{notice}</div>}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label htmlFor="name" style={{ display: "block", fontSize: 12, marginBottom: 6 }}>
              Full name / Legal name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Marcus Santos"
            />
          </div>

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
            <label htmlFor="chapter" style={{ display: "block", fontSize: 12, marginBottom: 6 }}>
              Primary chapter affiliation
            </label>
            <select id="chapter" value={chapter} onChange={(e) => setChapter(e.target.value)}>
              <option value="ph">WSB Philippines</option>
              <option value="hk">WSB Hong Kong</option>
              <option value="au">WSB Australia</option>
              <option value="nz">WSB New Zealand</option>
              <option value="za">WSB South Africa</option>
            </select>
          </div>

          <div>
            <label htmlFor="password" style={{ display: "block", fontSize: 12, marginBottom: 6 }}>
              Password (min. 8 characters)
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
            />
          </div>

          <label style={{ display: "flex", gap: 10, alignItems: "start", fontSize: 12, color: "var(--text-titanium)", cursor: "pointer", marginTop: 6 }}>
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              style={{ width: "auto", minHeight: 0, marginTop: 3 }}
            />
            <span>
              I agree to the WSB Competition Rules, Participant Waiver, and Privacy Safeguards.
            </span>
          </label>

          <button type="submit" className="button button-volt" style={{ marginTop: 12 }}>
            Create account <Arrow />
          </button>
        </form>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-titanium)", marginTop: 28, paddingTop: 20, borderTop: "1px solid var(--border-subtle)" }}>
          <span>Already have an account?</span>
          <Link href="/sign-in" className="text-link" style={{ minHeight: 0 }}>
            Sign in <Arrow />
          </Link>
        </div>
      </div>
    </div>
  );
}
