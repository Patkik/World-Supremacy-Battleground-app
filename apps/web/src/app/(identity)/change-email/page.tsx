"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { EmailAuthProvider, reauthenticateWithCredential, verifyBeforeUpdateEmail } from "firebase/auth";
import { Brand } from "@/components/ui";
import { identityError, useAccount } from "@/lib/account";
import { safeAuthReturn } from "@/lib/auth-return";

type LocalDelivery = { delivered?: boolean; verifyUrl?: string; error?: string };

export default function ChangeEmailPage() {
  const { user, loading, error: accountError } = useAccount();
  const [nextPath, setNextPath] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [deliveryWarning, setDeliveryWarning] = useState("");
  const [localActionUrl, setLocalActionUrl] = useState("");
  useEffect(() => {
    setNextPath(safeAuthReturn(new URLSearchParams(window.location.search).get("next"), window.location.origin));
  }, []);

  const hasPasswordProvider = user?.providerData.some(provider => provider.providerId === "password") ?? false;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user?.email) return;

    const email = newEmail.trim();
    if (!email || email.length > 254 || email.toLowerCase() === user.email.toLowerCase()) {
      setError(email.toLowerCase() === user.email.toLowerCase()
        ? "Enter an email address different from the current one."
        : "Enter a valid email address.");
      return;
    }
    if (hasPasswordProvider && !password) {
      setError("Enter your current password to confirm this account change.");
      return;
    }

    setSaving(true);
    setError("");
    setDeliveryWarning("");
    setLocalActionUrl("");
    setMessage("");
    try {
      if (hasPasswordProvider) {
        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, credential);
      }
      await verifyBeforeUpdateEmail(user, email, { url: `${location.origin}${nextPath || "/workspaces"}` });
      setPassword("");
      setMessage(`Firebase accepted the email change request for ${email}. Your current address remains active until the new address is verified.`);

      if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true") {
        try {
          const response = await fetch("/api/auth/send-verification-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, requestType: "VERIFY_AND_CHANGE_EMAIL", continueTo: nextPath }),
          });
          const delivery = await response.json() as LocalDelivery;
          if (!response.ok) {
            setDeliveryWarning("The local email request was accepted, but its message could not be delivered. Check the isolated Auth emulator action code.");
          } else if (delivery.delivered) {
            setMessage(`Email-change confirmation sent to ${email}. The current address remains active until the new address is verified.`);
          } else if (delivery.verifyUrl) {
            setLocalActionUrl(delivery.verifyUrl);
            setDeliveryWarning("Local email delivery is not configured. Use the isolated development action link below.");
          } else {
            setDeliveryWarning("The local email request was accepted. Check the isolated Auth emulator for its action code.");
          }
        } catch {
          setDeliveryWarning("The local email request was accepted, but its message could not be delivered. Check the isolated Auth emulator action code.");
        }
      }
    } catch (cause) {
      setError(identityError(cause));
    } finally {
      setSaving(false);
    }
  }

  return <main id="main-content" className="system-page">
    <Brand />
    <div className="account-form">
      <h1>Change email address</h1>
      <p className="muted">Firebase verifies the new address before it becomes the account email. Your current address stays active until you confirm the change.</p>
      {loading ? <p role="status">Loading your account…</p> : !user ? <>
        <p role="alert" className="form-error">{accountError || "Sign in before changing your account email."}</p>
        <Link className="button button-volt" href={nextPath ? `/sign-in?next=${encodeURIComponent(nextPath)}` : "/sign-in"}>Sign in</Link>
      </> : !user.email ? <p role="alert" className="form-error">This account has no email address to change.</p> : <>
        <form onSubmit={submit} className="connected-stack" aria-busy={saving}>
          <label htmlFor="current-account-email">Current email</label>
          <input id="current-account-email" type="email" value={user.email} readOnly disabled />
          <label htmlFor="new-account-email">New email address</label>
          <input id="new-account-email" type="email" autoComplete="email" maxLength={254} value={newEmail} onChange={event => setNewEmail(event.target.value)} required disabled={saving} />
          {hasPasswordProvider && <>
            <label htmlFor="current-account-password">Current password</label>
            <input id="current-account-password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required disabled={saving} />
          </>}
          {!hasPasswordProvider && <p className="fineprint">If Firebase asks for a recent sign-in, sign out and sign in again with this same identity provider, then retry.</p>}
          <button className="button button-volt" type="submit" disabled={saving}>{saving ? "Requesting confirmation…" : "Send confirmation to new email"}</button>
        </form>
        {message && <p className="info-note" role="status">{message}</p>}
        {localActionUrl && <p><a className="text-link" href={localActionUrl}>Open local email-change confirmation</a></p>}
        {deliveryWarning && <p className="form-error" role="alert">{deliveryWarning}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <Link className="text-link" href="/app/profile">Back to profile</Link>
      </>}
    </div>
  </main>;
}
