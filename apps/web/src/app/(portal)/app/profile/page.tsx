"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { updateProfile } from "firebase/auth";
import { Arrow, PageHeading, Status } from "@/components/ui";
import { useAccount } from "@/lib/account";

export default function ProfilePage() {
  const { user, loading, error: accountError } = useAccount();
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => { setDisplayName(user?.displayName || ""); }, [user?.uid, user?.displayName]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    const value = displayName.trim();
    if (value.length > 80) {
      setError("Display name must be 80 characters or fewer.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await updateProfile(user, { displayName: value || null });
      setDisplayName(user.displayName || "");
      setMessage("Firebase account display name saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Account display name could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main id="main-content" className="workspace-main"><PageHeading eyebrow="Account profile" title="Loading profile" description="Checking your signed-in Firebase account." /><p role="status">Loading account profile…</p></main>;
  if (!user) return <main id="main-content" className="workspace-main"><PageHeading eyebrow="Account profile" title="Sign in required" description="Sign in before editing account settings." /><p role="alert" className="form-error">{accountError || "Your signed-in account could not be loaded."}</p><Link href="/sign-in?next=%2Fapp%2Fprofile" className="button button-volt">Sign in</Link></main>;

  return <main id="main-content" className="workspace-main">
    <PageHeading eyebrow="Account settings" title="Profile" description="Update the display name saved to your Firebase account." />
    {message && <p role="status" className="info-note">{message}</p>}
    {error && <p role="alert" className="form-error">{error}</p>}
    <div className="max-w-2xl">
      <form onSubmit={saveProfile} className="panel connected-stack">
        <div className="panel-heading"><div><h2>Account identity</h2><p>These values come from your signed-in account.</p></div><Status tone={user.emailVerified ? "volt" : "amber"}>{user.emailVerified ? "Email verified" : "Email not verified"}</Status></div>
        <label htmlFor="account-display-name">Display name</label>
        <input id="account-display-name" autoComplete="name" maxLength={80} value={displayName} onChange={event => setDisplayName(event.target.value)} disabled={saving} />
        <label htmlFor="account-email">Email</label>
        <input id="account-email" type="email" value={user.email || ""} disabled readOnly />
        <p><Link href="/change-email" className="text-link">Change email address <Arrow /></Link></p>
        {!user.emailVerified && user.email && <p className="info-note" role="status">This email address has not been verified. <Link href="/verify-email" className="text-link">Request a verification link <Arrow /></Link></p>}
        <p className="fineprint">Display name is an account label only. This form does not change a verified legal name, crew roster name, stage alias, phone number or chapter membership.</p>
        <div className="flex flex-wrap gap-3"><button className="button button-volt" type="submit" disabled={saving}>{saving ? "Saving…" : "Save display name"} <Arrow /></button><Link href="/app/security" className="button button-outline">Account security</Link></div>
      </form>
    </div>
  </main>;
}
