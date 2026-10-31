"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { browserSessionPersistence, createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, setPersistence, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { firebaseClient } from "@/lib/firebase/client";
import { establishApiSession } from "@/lib/firebase/api-session";
import { identityError } from "@/lib/account";
import { Arrow, Brand } from "./ui";

export function IdentityForm({ mode }: { mode: "sign-in" | "sign-up" | "reset" }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const title = mode === "sign-in" ? "Sign in" : mode === "sign-up" ? "Create account" : "Reset password";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const auth = firebaseClient().auth;
      const settings = { url: `${window.location.origin}/workspaces` };
      await setPersistence(auth, browserSessionPersistence);
      if (mode === "reset") {
        try { await sendPasswordResetEmail(auth, email.trim(), settings); }
        catch (reason) {
          const code = typeof reason === "object" && reason && "code" in reason ? String(reason.code) : "";
          if (!code.includes("user-not-found")) throw reason;
        }
        setDone(true);
      } else if (mode === "sign-up") {
        const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(result.user, { displayName: name.trim() });
        router.push("/verify-email");
        // The verification page can retry delivery if this initial request fails.
        await sendEmailVerification(result.user, settings);
      } else {
        const result = await signInWithEmailAndPassword(auth, email.trim(), password);
        await establishApiSession(result.user, email.trim(), password);
        const next=new URLSearchParams(window.location.search).get("next");
        const target=next?new URL(next,window.location.origin):null;
        const permitted=target?.origin===window.location.origin&&["/invite/","/app/register/","/app/entries/"].some(prefix=>target.pathname.startsWith(prefix));
        router.push(permitted&&target?`${target.pathname}${target.search}`:"/workspaces");
      }
    } catch (reason) { setError(identityError(reason)); }
    finally { setBusy(false); }
  }

  return <main id="main-content" className="system-page"><Brand /><div className="account-form">
    <h1>{title}</h1>
    <p className="muted">{mode === "sign-in" ? "Access your crew and assigned event workspace." : mode === "sign-up" ? "Create your personal account. Chapter access is approved separately." : "We’ll send a link to help you choose a new password."}</p>
    {done ? <p role="status" className="info-note">If an account exists for {email}, a reset link has been sent.</p> : <form onSubmit={submit} aria-busy={busy || !ready}>
      {mode === "sign-up" && <label htmlFor="account-name">Your name<input id="account-name" disabled={!ready} autoComplete="name" required maxLength={100} value={name} onChange={e => setName(e.target.value)} /></label>}
      <label htmlFor="account-email">Email address<input id="account-email" disabled={!ready} type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
      {mode !== "reset" && <div><div className="account-password-label"><label htmlFor="account-password">Password</label>{mode === "sign-in" && <Link href="/forgot-password">Forgot password?</Link>}</div>
        <input id="account-password" disabled={!ready} type={show ? "text" : "password"} autoComplete={mode === "sign-up" ? "new-password" : "current-password"} required minLength={mode === "sign-up" ? 8 : undefined} value={password} onChange={e => setPassword(e.target.value)} />
        <button className="text-link" type="button" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow(!show)}>{show ? "Hide password" : "Show password"}</button>
        {mode === "sign-up" && <p className="field-help">Use at least eight characters.</p>}
      </div>}
      {error && <p id="account-error" className="form-error" role="alert">{error}</p>}
      <button className="button button-volt" disabled={busy || !ready}>{busy || !ready ? "Please wait…" : mode === "reset" ? "Send reset link" : title}<Arrow /></button>
    </form>}
    <p className="fineprint">This browser session ends when you close the browser. Your role is verified by the server.</p>
    <Link className="text-link" href={mode === "sign-in" ? "/sign-up" : "/sign-in"}>{mode === "sign-in" ? "Create an account" : "Back to sign in"}<Arrow /></Link>
    <Link className="text-link" href="/preview">Explore sample screens<Arrow diagonal /></Link>
  </div></main>;
}
