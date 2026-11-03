"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount } from "@/lib/account";
import { ApiError } from "@/lib/connected-api";
import { registrationCommand } from "@/lib/registration-command";
import { Brand } from "./ui";

type Membership = { chapter_id: string; role: string; expires_at: number | null };

const codeKey = "wsb:staff-invitation-code";

function invitationError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Sign in again, then reopen the invitation link.";
    if (error.status === 403) return "This invitation belongs to a different signed-in account.";
    if (error.status === 404) return "The invitation was not found or is no longer available.";
    if (error.status === 409) return "This invitation expired, was revoked, or has already been used.";
    if (error.status === 503) return "The invitation service is unavailable. Your link is saved in this tab; try again later.";
  }
  return error instanceof Error ? error.message : "The staff invitation could not be accepted.";
}

export function StaffInvitationAcceptance() {
  const { user, loading } = useAccount();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [membership, setMembership] = useState<Membership | null>(null);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const fragmentCode = window.location.hash.slice(1);
    const savedCode = fragmentCode || sessionStorage.getItem(codeKey) || "";
    setCode(savedCode);
    if (savedCode) sessionStorage.setItem(codeKey, savedCode);
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  async function accept() {
    if (!user || !code || busy || !online) return;
    setBusy(true); setError("");
    try {
      const result = await registrationCommand<Membership>(
        "/v1/account/staff-invitations/accept",
        { invite_code: code },
        "POST", false, user.uid,
      );
      setMembership(result);
      sessionStorage.removeItem(codeKey);
      window.history.replaceState(null, "", window.location.pathname);
      setCode("");
    } catch (cause) {
      setError(invitationError(cause));
    } finally { setBusy(false); }
  }

  return <main id="main-content" className="system-page"><Brand /><div className="account-form">
    <p className="eyebrow">Chapter access</p><h1>Accept a staff invitation</h1>
    {loading ? <p role="status">Checking your signed-in account…</p> : !user ? <section className="connected-stack"><p>Sign in to the WSB account named by the invitation. The code stays in this browser tab.</p><Link className="button button-volt" href={`/sign-in?next=${encodeURIComponent("/staff-invitations/accept")}`}>Sign in to continue</Link></section> : membership ? <section className="connected-stack" role="status"><h2>Invitation accepted</h2><p>Your {membership.role.replaceAll("_", " ")} role for chapter {membership.chapter_id.toUpperCase()} has been recorded.</p><p>Sign out and sign in again to activate the new chapter access. Access expires {membership.expires_at ? new Date(membership.expires_at * 1000).toLocaleString() : "according to the chapter record"}.</p><Link className="button button-outline" href="/workspaces">Go to your workspaces</Link></section> : <section className="connected-stack">
      <p>The invitation is bound to your signed-in account. It can be used once and must be accepted within seven days.</p>
      {!code && <p role="alert" className="form-error">This page has no invitation code. Reopen the complete invitation link.</p>}
      {!online && <p role="status" className="form-error">You are offline. Acceptance requires a connection; your invitation remains available in this tab.</p>}
      {error && <p role="alert" className="form-error">{error}</p>}
      <button className="button button-volt" type="button" disabled={!code || busy || !online} onClick={() => void accept()}>{busy ? "Accepting invitation…" : "Accept staff invitation"}</button>
    </section>}
  </div></main>;
}
