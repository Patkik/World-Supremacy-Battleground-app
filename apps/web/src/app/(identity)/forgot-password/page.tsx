"use client";

import Link from "next/link";
import { useState } from "react";
import { Arrow, Brand } from "@/components/ui";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
    }
  }

  return (
    <div className="system-page">
      <Brand />
      <div style={{ maxWidth: 460, width: "100%", marginTop: 24 }}>
        <p className="eyebrow">Account Recovery · P1</p>
        <h1 style={{ fontSize: "clamp(32px, 4vw, 48px)", margin: "8px 0 16px" }}>Reset Password</h1>
        
        {submitted ? (
          <div>
            <p className="muted" style={{ lineHeight: 1.8, marginBottom: 24 }}>
              If an account exists for <strong>{email}</strong>, a password reset link has been dispatched. For security reasons, we do not disclose whether an address is registered.
            </p>
            <Link href="/sign-in" className="button button-volt">
              Return to sign in <Arrow />
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p className="muted" style={{ marginBottom: 16 }}>
              Enter your registered email address. We will send a secure password reset link.
            </p>
            <div>
              <label htmlFor="email" style={{ display: "block", fontSize: 12, marginBottom: 6 }}>
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dancer@example.com"
              />
            </div>

            <button type="submit" className="button button-volt" style={{ marginTop: 8 }}>
              Send reset link <Arrow />
            </button>

            <Link href="/sign-in" className="text-link" style={{ fontSize: 12, marginTop: 16 }}>
              Back to sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
