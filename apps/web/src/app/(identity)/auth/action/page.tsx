"use client";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { applyActionCode, confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { firebaseClient } from "@/lib/firebase/client";
import { identityError } from "@/lib/account";
import { safeAuthReturn } from "@/lib/auth-return";
import { Brand } from "@/components/ui";

function Action() {
  const params = useSearchParams();
  const mode = params.get("mode"); const code = params.get("oobCode") || "";
  const continuation = safeAuthReturn(params.get("continue"), "https://wsb.invalid");
  const [state, setState] = useState("checking");
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const actionRequest = useRef<{ key: string; promise: Promise<void> } | null>(null);
  useEffect(() => {
    let alive = true;
    const key = `${mode}:${code}`;
    if (actionRequest.current?.key !== key) {
      actionRequest.current = { key, promise: (async () => {
        if (!code || !["verifyEmail", "verifyAndChangeEmail", "resetPassword"].includes(mode || "")) throw new Error("Unsupported action");
        const auth = firebaseClient().auth;
        if (mode === "verifyEmail" || mode === "verifyAndChangeEmail") { await applyActionCode(auth, code); await auth.currentUser?.reload(); }
        else await verifyPasswordResetCode(auth, code);
      })() };
    }
    // Reuse the in-flight action during React's effect rehearsal. Verification
    // links are single use and must not be consumed twice on the same mount.
    actionRequest.current.promise.then(() => { if (alive) setState(mode === "resetPassword" ? "ready" : "done"); })
      .catch(reason => { if (alive) { setError(identityError(reason)); setState("error"); } });
    return () => { alive = false; };
  }, [mode, code]);
  async function reset(event: FormEvent) {
    event.preventDefault(); setState("saving"); setError("");
    try { await confirmPasswordReset(firebaseClient().auth, code, password); setState("done"); }
    catch (reason) { setError(identityError(reason)); setState("error"); }
  }
  const actionTitle = mode === "resetPassword" ? "Reset password" : mode === "verifyAndChangeEmail" ? "Confirm email change" : "Verify email";
  const completionMessage = mode === "resetPassword"
    ? "Password changed. You can now sign in."
    : mode === "verifyAndChangeEmail"
      ? "Email address updated. If you are signed in elsewhere, use the new address the next time you sign in."
      : "Email verified. Your chapter membership is checked separately.";
  const recoveryHref = mode === "resetPassword" ? "/forgot-password" : mode === "verifyAndChangeEmail" ? "/change-email" : "/verify-email";
  const recoveryLabel = mode === "resetPassword" ? "Request a new password reset link" : mode === "verifyAndChangeEmail" ? "Request a new email-change link" : "Request a new verification link";
  return <div className="account-form"><h1>{actionTitle}</h1>
    {state === "checking" && <p role="status">Checking your link…</p>}
    {error && <p role="alert" className="form-error">{error}</p>}
    {state === "error" && <Link className="text-link" href={recoveryHref}>{recoveryLabel}</Link>}
    {["ready", "saving"].includes(state) && <form onSubmit={reset}><label htmlFor="new-password">New password<input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} /></label><button className="button button-volt" disabled={state === "saving"}>Save password</button></form>}
    {state === "done" && <p role="status">{completionMessage}</p>}
    {state === "done" && continuation && <Link className="text-link" href={continuation}>Continue to your invitation or registration</Link>}
    <Link className="text-link" href="/sign-in">Return to sign in</Link>
  </div>;
}
export default function Page() { return <main id="main-content" className="system-page"><Brand /><Suspense fallback={<p>Checking your link…</p>}><Action /></Suspense></main>; }
