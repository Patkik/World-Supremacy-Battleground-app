"use client";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { applyActionCode, confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { firebaseClient } from "@/lib/firebase/client";
import { identityError } from "@/lib/account";
import { Brand } from "@/components/ui";

function Action() {
  const params = useSearchParams();
  const mode = params.get("mode"); const code = params.get("oobCode") || "";
  const [state, setState] = useState("checking");
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const actionRequest = useRef<{ key: string; promise: Promise<void> } | null>(null);
  useEffect(() => {
    let alive = true;
    const key = `${mode}:${code}`;
    if (actionRequest.current?.key !== key) {
      actionRequest.current = { key, promise: (async () => {
        if (!code || !["verifyEmail", "resetPassword"].includes(mode || "")) throw new Error("Unsupported action");
        const auth = firebaseClient().auth;
        if (mode === "verifyEmail") { await applyActionCode(auth, code); await auth.currentUser?.reload(); }
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
  return <div className="account-form"><h1>{mode === "resetPassword" ? "Reset password" : "Verify email"}</h1>
    {state === "checking" && <p role="status">Checking your link…</p>}
    {error && <p role="alert" className="form-error">{error}</p>}
    {["ready", "saving"].includes(state) && <form onSubmit={reset}><label htmlFor="new-password">New password<input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} /></label><button className="button button-volt" disabled={state === "saving"}>Save password</button></form>}
    {state === "done" && <p role="status">{mode === "resetPassword" ? "Password changed. You can now sign in." : "Email verified. Your chapter membership is checked separately."}</p>}
    <Link className="text-link" href="/sign-in">Return to sign in</Link>
  </div>;
}
export default function Page() { return <main id="main-content" className="system-page"><Brand /><Suspense fallback={<p>Checking your link…</p>}><Action /></Suspense></main>; }
