"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { browserSessionPersistence, createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, setPersistence, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { firebaseClient } from "@/lib/firebase/client";
import { establishApiSession } from "@/lib/firebase/api-session";
import { identityError } from "@/lib/account";
import { routeWithAuthReturn, safeAuthReturn } from "@/lib/auth-return";
import { Arrow, Brand } from "./ui";

export function IdentityForm({ mode }: { mode: "sign-in" | "sign-up" | "reset" }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [nextPath, setNextPath] = useState<string | null>(null);
  useEffect(() => {
    setNextPath(safeAuthReturn(new URLSearchParams(window.location.search).get("next"), window.location.origin));
    setReady(true);
  }, []);
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
      const returnPath = safeAuthReturn(new URLSearchParams(window.location.search).get("next"), window.location.origin);
      const settings = { url: `${window.location.origin}${mode === "reset" ? "/workspaces" : returnPath || "/workspaces"}` };
      await setPersistence(auth, browserSessionPersistence);
      if (mode === "reset") {
        try { await sendPasswordResetEmail(auth, email.trim(), settings); }
        catch (reason) {
          const code = typeof reason === "object" && reason && "code" in reason ? String(reason.code) : "";
          if (!code.includes("user-not-found")) throw reason;
        }
        if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true") try {
          await fetch("/api/auth/send-reset-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email.trim() }),
          });
        } catch {}
        setDone(true);
      } else if (mode === "sign-up") {
        const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(result.user, { displayName: name.trim() });
        router.push(routeWithAuthReturn("/verify-email", returnPath));
        // The verification page can retry delivery if this initial request fails.
        await sendEmailVerification(result.user, settings);
        if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true") try {
          await fetch("/api/auth/send-verification-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email.trim(), continueTo: returnPath }),
          });
        } catch {}
      } else {
        const result = await signInWithEmailAndPassword(auth, email.trim(), password);
        if (!result.user.emailVerified) {
          router.push(routeWithAuthReturn("/verify-email", returnPath));
          return;
        }
        await establishApiSession(result.user, email.trim(), password);
        router.push(returnPath || "/workspaces");
      }
    } catch (reason) { setError(identityError(reason)); }
    finally { setBusy(false); }
  }

  return <main id="main-content" className="identity-scene">
    <header className="identity-header"><Brand /><Link href="/" className="text-link">Back to WSB <Arrow diagonal /></Link></header>
    <div className="identity-columns">
      <aside className="identity-poster" aria-label="The WSB movement">
        {/* Existing generated artwork is decorative, not a real competitor or event photograph. */}
        <Image src="/images/dance-hero.png" alt="" fill priority sizes="(max-width: 760px) 100vw, 55vw" className="identity-artwork" />
        <div className="identity-poster-shade" />
        <div className="identity-poster-copy"><p className="eyebrow">From the streets. To the world.</p>
          <p className="identity-statement">{(mode === "sign-in" ? ["BACK TO", "YOUR", "ELEMENT."] : mode === "sign-up" ? ["MAKE YOUR", "FIRST", "MOVE."] : ["RESET.", "RETURN.", "GO AGAIN."]).map((line,index)=><span key={line} className={index===2?"identity-statement-accent":""}>{line}</span>)}</p>
          <p className="identity-poster-note">Your people. Your preparation.<br/>Your next moment on stage.</p>
        </div>
        <div className="identity-poster-footer"><span className="mono">PREPARE / PERFORM / REPRESENT</span><span className="identity-tag">ONE MOVEMENT.</span></div>
      </aside>
      <section className="identity-form-area" aria-label={title}><div className="account-form identity-account-form">
    <p className="eyebrow identity-form-eyebrow">{mode === "sign-in" ? "Your next move starts here" : mode === "sign-up" ? "Join the movement" : "Get back to your workspace"}</p>
    <h1>{title}</h1>
    <p className="muted">{mode === "sign-in" ? "Access your crew and assigned event workspace." : mode === "sign-up" ? "Create your personal account. Chapter access is approved separately." : "We’ll send a link to help you choose a new password."}</p>
    {done ? <p role="status" className="info-note">If an account exists for {email}, a reset link has been sent.</p> : <form onSubmit={submit} aria-busy={busy || !ready}>
      {mode === "sign-up" && <label htmlFor="account-name">Your name<input id="account-name" disabled={!ready} autoComplete="name" required maxLength={100} value={name} onChange={e => setName(e.target.value)} /></label>}
      <label htmlFor="account-email">Email address<input id="account-email" disabled={!ready} type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
      {mode !== "reset" && <div className="identity-password"><div className="account-password-label"><label htmlFor="account-password">Password</label>{mode === "sign-in" && <Link href={routeWithAuthReturn("/forgot-password", nextPath)}>Forgot password?</Link>}</div>
        <input id="account-password" disabled={!ready} type={show ? "text" : "password"} autoComplete={mode === "sign-up" ? "new-password" : "current-password"} required minLength={mode === "sign-up" ? 8 : undefined} value={password} onChange={e => setPassword(e.target.value)} />
        <button className="text-link" type="button" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow(!show)}>{show ? "Hide password" : "Show password"}</button>
        {mode === "sign-up" && <p className="field-help">Use at least eight characters.</p>}
      </div>}
      {error && <p id="account-error" className="form-error" role="alert">{error}</p>}
      <button className="button button-volt" disabled={busy || !ready}>{busy || !ready ? "Please wait…" : mode === "reset" ? "Send reset link" : title}<Arrow /></button>
    </form>}
    <p className="fineprint identity-session-note">Your browser session ends when you close the browser. Chapter access is checked separately.</p>
    <div className="identity-join"><span>{mode === "sign-in" ? "New to WSB?" : "Already have an account?"}</span><Link className="text-link" href={routeWithAuthReturn(mode === "sign-in" ? "/sign-up" : "/sign-in", nextPath)}>{mode === "sign-in" ? "Create an account" : "Back to sign in"}<Arrow /></Link></div>
    <Link className="text-link identity-help" href="/help">Need a hand? Get help <Arrow diagonal /></Link>
  </div><div className="identity-form-footer"><span>CREWS / DANCERS / EVENT TEAMS</span><span>WORLD SUPREMACY BATTLEGROUNDS</span></div></section>
  </div></main>;
}
