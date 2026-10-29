"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Arrow, Brand } from "@/components/ui";

export default function VerifyEmailPage() {
  const [cooldown, setCooldown] = useState(60);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  function handleResend() {
    if (cooldown === 0) {
      setResent(true);
      setCooldown(60);
    }
  }

  return (
    <div className="system-page">
      <Brand />
      <div style={{ maxWidth: 460, width: "100%", marginTop: 24 }}>
        <p className="eyebrow">Security & Verification · P1</p>
        <h1 style={{ fontSize: "clamp(32px, 4vw, 48px)", margin: "8px 0 16px" }}>Check Your Email</h1>
        <p className="muted" style={{ lineHeight: 1.8, marginBottom: 24 }}>
          We sent a verification link to your email. Click the link inside to verify your account and activate your competition privileges.
        </p>

        {resent && (
          <div className="info-note" style={{ marginBottom: 20 }}>
            A fresh verification link has been sent to your address.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <button
            onClick={handleResend}
            disabled={cooldown > 0}
            className="button button-outline"
          >
            {cooldown > 0 ? `Resend email in ${cooldown}s` : "Resend verification email"}
          </button>

          <Link href="/app" className="button button-volt">
            Open personal dashboard <Arrow />
          </Link>
        </div>
      </div>
    </div>
  );
}
