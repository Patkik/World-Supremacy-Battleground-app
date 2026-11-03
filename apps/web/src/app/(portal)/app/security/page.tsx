"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { Arrow, PageHeading, Status } from "@/components/ui";
import { useAccount } from "@/lib/account";
import { firebaseClient } from "@/lib/firebase/client";

function authMessage(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  if (code.includes("wrong-password") || code.includes("invalid-credential")) return "The current password was not accepted.";
  if (code.includes("requires-recent-login")) return "Sign in again, then retry the password change.";
  if (code.includes("weak-password")) return "Choose a stronger password and try again.";
  if (code.includes("network-request-failed")) return "Network unavailable. Your password was not changed.";
  return error instanceof Error ? error.message : "Password could not be changed.";
}

export default function SecurityPage() {
  const { user, loading, error: accountError } = useAccount();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!user?.email) {
      setError("A password sign-in account is not available for this user.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("The new password and confirmation do not match.");
      return;
    }
    if (currentPassword === newPassword) {
      setError("Choose a password different from the current password.");
      return;
    }
    setSaving(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Password updated with Firebase Auth.");
    } catch (cause) {
      setError(authMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main id="main-content" className="workspace-main"><PageHeading eyebrow="Account security" title="Loading account" description="Checking your signed-in Firebase account." /><p role="status">Loading account security…</p></main>;
  if (!user) return <main id="main-content" className="workspace-main"><PageHeading eyebrow="Account security" title="Sign in required" description="Sign in before changing account security settings." /><p role="alert" className="form-error">{accountError || "Your signed-in account could not be loaded."}</p><Link href="/sign-in?next=%2Fapp%2Fsecurity" className="button button-volt">Sign in</Link></main>;

  const hasPasswordProvider = user.providerData.some(provider => provider.providerId === "password");
  const lastSignIn = user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime) : null;

  return <main id="main-content" className="workspace-main">
    <PageHeading eyebrow="Account security" title="Security" description="Review facts Firebase exposes for this account and change your password after reauthentication." />
    {message && <p className="info-note" role="status">{message}</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="connected-stack max-w-2xl">
      <section className="panel">
        <div className="panel-heading"><div><h2>Account and sign-in</h2><p>Only the current account's Firebase data is shown here.</p></div><Status tone={user.emailVerified ? "volt" : "amber"}>{user.emailVerified ? "Email verified" : "Email not verified"}</Status></div>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div><dt className="eyebrow">Email</dt><dd className="break-all">{user.email || "Not available"}</dd></div>
          <div><dt className="eyebrow">Sign-in provider</dt><dd>{user.providerData.map(provider => provider.providerId).join(", ") || "Not available"}</dd></div>
          <div><dt className="eyebrow">Last sign-in</dt><dd>{lastSignIn && Number.isFinite(lastSignIn.getTime()) ? lastSignIn.toLocaleString() : "Not available"}</dd></div>
          <div><dt className="eyebrow">Other device sessions</dt><dd>Not listed by this client</dd></div>
        </dl>
        <p className="fineprint mt-4">This page cannot list or revoke other device sessions. Use the sign-out action on a shared device; password change does not claim a remote-session revocation.</p>
      </section>

      <section className="panel">
        <div className="panel-heading"><div><h2>Change password</h2><p>Firebase requires the current password to reauthenticate before this change.</p></div><Status>{hasPasswordProvider ? "Password sign-in" : "No password provider"}</Status></div>
        {hasPasswordProvider ? <form onSubmit={changePassword} className="connected-stack">
          <label htmlFor="current-password">Current password</label>
          <input id="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} required disabled={saving} />
          <label htmlFor="new-password">New password</label>
          <input id="new-password" type="password" autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} minLength={6} required disabled={saving} />
          <label htmlFor="confirm-password">Confirm new password</label>
          <input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} minLength={6} required disabled={saving} />
          <button type="submit" className="button button-volt" disabled={saving}>{saving ? "Updating…" : "Update password"} <Arrow /></button>
        </form> : <p>This account does not use password sign-in. Use the configured identity provider to manage its credentials. <Link href="/forgot-password" className="text-link">Password reset options <Arrow diagonal /></Link></p>}
      </section>
    </div>
  </main>;
}
