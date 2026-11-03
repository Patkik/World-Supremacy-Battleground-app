"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { updateProfile, type User } from "firebase/auth";
import { Brand } from "@/components/ui";
import { useAccount } from "@/lib/account";
import { firebaseClient } from "@/lib/firebase/client";

export default function OnboardingPage() {
  const { user, loading, error } = useAccount();
  if (loading) return <main id="main-content" className="system-page"><Brand /><p role="status">Checking your account…</p></main>;
  if (!user) return <main id="main-content" className="system-page"><Brand /><div className="account-form"><h1>Set up your account</h1><p>{error || "Sign in to continue."}</p><Link className="button button-volt" href="/sign-in?next=%2Fonboarding">Sign in</Link></div></main>;
  return <AccountSetup key={user.uid} user={user} />;
}

function AccountSetup({ user }: { user: User }) {
  const [name, setName] = useState(user.displayName || "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { setName(user.displayName || ""); }, [user.uid, user.displayName]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = name.trim();
    if (!value || value.length > 80) { setError("Enter a display name of up to 80 characters."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      if (firebaseClient().auth.currentUser?.uid !== user.uid) throw new Error("Your account changed. Sign in again.");
      await updateProfile(user, { displayName: value });
      if (firebaseClient().auth.currentUser?.uid !== user.uid) return;
      setName(user.displayName || value);
      setMessage("Display name saved to your account.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save your display name."); }
    finally { setBusy(false); }
  }
  return <main id="main-content" className="system-page"><Brand /><div className="account-form">
    <p className="eyebrow">Account setup</p><h1>Set up your account</h1>
    <p>Choose the name shown on your account. Your chapter membership and competition eligibility are checked separately.</p>
    <form onSubmit={save} className="connected-stack">
      <label htmlFor="onboarding-name">Display name</label>
      <input id="onboarding-name" autoComplete="name" required maxLength={80} value={name} disabled={busy} onChange={event => setName(event.target.value)} />
      <p className="fineprint">This is an account label; it does not change a verified identity or crew roster.</p>
      <button type="submit" className="button button-volt" disabled={busy}>{busy ? "Saving…" : "Save display name"}</button>
    </form>
    {message && <p role="status" className="info-note">{message}</p>}{error && <p role="alert" className="form-error">{error}</p>}
    {!user.emailVerified && <p>Verify your email before entering a chapter workspace. <Link href="/verify-email?next=%2Fonboarding" className="text-link">Verify email</Link></p>}
    <p><Link className="button button-outline" href="/workspaces">Choose a chapter workspace</Link></p>
  </div></main>;
}
