"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { reload, sendEmailVerification } from "firebase/auth";
import { identityError, useAccount } from "@/lib/account";
import { safeAuthReturn } from "@/lib/auth-return";
import { Brand } from "@/components/ui";

export default function Page() {
  const { user, loading, error: accountError } = useAccount();
  const [nextPath, setNextPath] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [verified, setVerified] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sentAt, setSentAt] = useState(0);
  useEffect(() => {
    setNextPath(safeAuthReturn(new URLSearchParams(window.location.search).get("next"), window.location.origin));
  }, []);
  async function send() {
    if (!user?.email || user.emailVerified) return;
    if (Date.now() - sentAt < 60000) { setMessage("Please wait a minute before requesting another link."); return; }
    setBusy(true); setError("");
    try {
      await sendEmailVerification(user, { url: `${location.origin}${nextPath || "/workspaces"}` });
      if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true") try {
        await fetch("/api/auth/send-verification-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email, continueTo: nextPath }),
        });
      } catch {}
      setSentAt(Date.now());
      setMessage("Verification link sent. Check your inbox.");
    }
    catch (reason) { setError(identityError(reason)); }
    finally { setBusy(false); }
  }
  async function checkStatus() {
    if (!user) return;
    setChecking(true); setError(""); setMessage("");
    try {
      await reload(user);
      setVerified(user.emailVerified);
      setMessage(user.emailVerified
        ? "Email verified. Chapter membership is checked separately."
        : "Email is not verified yet. Open the latest link from your inbox, then check again.");
    } catch (reason) { setError(identityError(reason)); }
    finally { setChecking(false); }
  }
  return <main id="main-content" className="system-page"><Brand /><div className="account-form"><h1>Verify your email</h1>
    {loading ? <p role="status">Loading your account…</p> : !user ? <Link href={nextPath ? `/sign-in?next=${encodeURIComponent(nextPath)}` : "/sign-in"}>Sign in to request a verification link</Link> : <><p>Open the verification link sent to {user.email || "your account"}. Email verification does not grant chapter membership.</p>
      {verified || user.emailVerified ? <p role="status" className="info-note">Email verified. Chapter membership is checked separately.</p> : <button className="button button-volt" disabled={busy || checking || !user.email} onClick={send}>{busy ? "Sending…" : "Send verification link"}</button>}
      <button className="button button-outline" disabled={busy || checking} onClick={checkStatus}>{checking ? "Checking…" : "I opened the link — check status"}</button>
      <Link className="text-link" href={nextPath ? `/change-email?next=${encodeURIComponent(nextPath)}` : "/change-email"}>Use a different email address</Link>
      <Link className="text-link" href={nextPath || "/workspaces"}>{nextPath ? "Continue to your request" : "Check workspace access"}</Link></>}
    {message && <p role="status">{message}</p>}{(error || accountError) && <p className="form-error" role="alert">{error || accountError}</p>}
  </div></main>;
}
