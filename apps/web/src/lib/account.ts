"use client";

import { useEffect, useState } from "react";
import { onIdTokenChanged, type User } from "firebase/auth";
import { firebaseClient } from "./firebase/client";
import { chapterSession } from "./api";
import { clearLocalSessionUnless } from "./firebase/api-session";

export type WorkspaceSession = { uid: string; chapter_id: string; role: string };

export function useAccount() {
  const [account, setAccount] = useState<{ user: User | null; loading: boolean; error: string }>({ user: null, loading: true, error: "" });
  useEffect(() => {
    try {
      return onIdTokenChanged(firebaseClient().auth, user => {
        clearLocalSessionUnless(user?.uid);
        setAccount({ user, loading: false, error: "" });
      }, () => setAccount({ user: null, loading: false, error: "Your session could not be loaded. Sign in again." }));
    } catch {
      setAccount({ user: null, loading: false, error: "Account services are unavailable. Please try again later." });
    }
  }, []);
  return account;
}

export function useWorkspaceSession() {
  const account = useAccount();
  const [session, setSession] = useState<WorkspaceSession | null>(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  useEffect(() => {
    let alive = true;
    setSession(null); setError("");
    if (!account.user) return;
    setChecking(true);
    account.user.getIdTokenResult().then(async result => {
      const chapter = result.claims.chapterId;
      if (typeof chapter !== "string" || !chapter) throw new Error("Your chapter membership is awaiting approval. Contact your chapter organizer.");
      return chapterSession(chapter);
    }).then(value => { if (alive) setSession(value); }).catch(reason => { if (alive) setError(reason instanceof Error ? reason.message : "Unable to verify chapter access."); }).finally(() => { if (alive) setChecking(false); });
    return () => { alive = false; };
  }, [account.user]);
  return { ...account, session, loading: account.loading || checking, error: account.error || error };
}

export function identityError(reason: unknown) {
  const code = typeof reason === "object" && reason !== null && "code" in reason ? String(reason.code) : "";
  if (code.includes("network")) return "Unable to connect. Check your connection and try again.";
  if (code.includes("too-many")) return "Too many attempts. Please wait a moment before trying again.";
  if (code.includes("weak-password")) return "Choose a stronger password with at least eight characters.";
  if (code.includes("expired-action") || code.includes("invalid-action")) return "This link has expired or was already used. Request a new link.";
  return "We could not complete this action. Check your details and try again.";
}
