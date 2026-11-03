"use client";

import { useEffect, useState } from "react";
import { onIdTokenChanged, type User } from "firebase/auth";
import { firebaseClient } from "./firebase/client";
import { chapterSession } from "./api";
import { clearLocalSessionUnless } from "./firebase/api-session";

export type WorkspaceSession = { uid: string; chapter_id: string; role: string };

function selectedChapterKey(uid: string) {
  return `wsb:active-chapter:${encodeURIComponent(uid)}`;
}

export function selectedChapterFor(uid: string): string | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage.getItem(selectedChapterKey(uid)); } catch { return null; }
}

export function selectChapterFor(uid: string, chapterId: string) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(selectedChapterKey(uid), chapterId); } catch { /* Chapter access is still server-checked. */ }
  window.dispatchEvent(new CustomEvent("wsb:active-chapter-change", { detail: { uid, chapterId } }));
}

function rememberVerifiedChapterFor(uid: string, chapterId: string) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(selectedChapterKey(uid), chapterId); } catch { /* Offline score recovery still requires the server to verify access. */ }
}

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

export function useWorkspaceSession(chapterOverride?: string) {
  const account = useAccount();
  const [session, setSession] = useState<WorkspaceSession | null>(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [selectionRevision, setSelectionRevision] = useState(0);
  const uid = account.user?.uid;
  const selectedChapter = uid ? selectedChapterFor(uid) : null;
  const requestedChapter = chapterOverride?.trim() || selectedChapter;
  const activeSession = session && uid === session.uid && (!requestedChapter || requestedChapter === session.chapter_id)
    ? session
    : null;
  useEffect(() => {
    if (!uid) return;
    const onStorage = (event: StorageEvent) => {
      if (event.key === selectedChapterKey(uid) || event.key === null) setSelectionRevision(value => value + 1);
    };
    const onSelection = (event: Event) => {
      const detail = (event as CustomEvent<{ uid?: string }>).detail;
      if (detail?.uid === uid) setSelectionRevision(value => value + 1);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("wsb:active-chapter-change", onSelection);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("wsb:active-chapter-change", onSelection);
    };
  }, [uid]);
  useEffect(() => {
    const retry = () => setSelectionRevision(value => value + 1);
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, []);
  useEffect(() => {
    let alive = true;
    setSession(null); setError("");
    if (!account.user) { setChecking(false); return; }
    setChecking(true);
    account.user.getIdTokenResult().then(async result => {
      const chapter = chapterOverride?.trim() || selectedChapterFor(account.user!.uid) || result.claims.chapterId;
      if (typeof chapter !== "string" || !chapter) throw new Error("Choose a chapter from your workspace before continuing.");
      return chapterSession(chapter);
    }).then(value => {
      if (!alive) return;
      // Offline score recovery needs a chapter scope. Store it only after the
      // server has rechecked the account's current membership and role.
      if (!chapterOverride?.trim()) rememberVerifiedChapterFor(account.user!.uid, value.chapter_id);
      setSession(value);
    }).catch(reason => { if (alive) setError(reason instanceof Error ? reason.message : "Unable to verify chapter access."); }).finally(() => { if (alive) setChecking(false); });
    return () => { alive = false; };
  }, [account.user, chapterOverride, selectionRevision]);
  return { ...account, session: activeSession, loading: account.loading || checking, error: account.error || error };
}

export function identityError(reason: unknown) {
  const code = typeof reason === "object" && reason !== null && "code" in reason ? String(reason.code) : "";
  if (code.includes("network")) return "Unable to connect. Check your connection and try again.";
  if (code.includes("too-many")) return "Too many attempts. Please wait a moment before trying again.";
  if (code.includes("requires-recent-login")) return "Sign out and sign back in with this account, then retry the email change.";
  if (code.includes("wrong-password") || code.includes("invalid-credential")) return "The current password could not be confirmed.";
  if (code.includes("email-already-in-use")) return "That email address is already linked to another account.";
  if (code.includes("invalid-email")) return "Enter a valid email address.";
  if (code.includes("weak-password")) return "Choose a stronger password with at least eight characters.";
  if (code.includes("expired-action") || code.includes("invalid-action")) return "This link has expired or was already used. Request a new link.";
  return "We could not complete this action. Check your details and try again.";
}
