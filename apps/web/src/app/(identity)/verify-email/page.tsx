"use client";
import Link from "next/link";
import { useState } from "react";
import { sendEmailVerification } from "firebase/auth";
import { identityError, useAccount } from "@/lib/account";
import { Brand } from "@/components/ui";

export default function Page() {
  const { user, loading, error: accountError } = useAccount();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sentAt, setSentAt] = useState(0);
  async function send() {
    if (!user) return;
    if (Date.now() - sentAt < 60000) { setMessage("Please wait a minute before requesting another link."); return; }
    setBusy(true); setError("");
    try { await sendEmailVerification(user, { url: `${location.origin}/workspaces` }); setSentAt(Date.now()); setMessage("Verification link sent. Check your inbox."); }
    catch (reason) { setError(identityError(reason)); }
    finally { setBusy(false); }
  }
  return <main id="main-content" className="system-page"><Brand /><div className="account-form"><h1>Verify your email</h1>
    {loading ? <p role="status">Loading your account…</p> : !user ? <Link href="/sign-in">Sign in to request a verification link</Link> : <><p>Open the verification link sent to {user.email}. You can request another link below.</p><button className="button button-volt" disabled={busy} onClick={send}>{busy ? "Sending…" : "Send verification link"}</button><Link className="text-link" href="/workspaces">Check workspace access</Link></>}
    {message && <p role="status">{message}</p>}{(error || accountError) && <p className="form-error" role="alert">{error || accountError}</p>}
  </div></main>;
}
