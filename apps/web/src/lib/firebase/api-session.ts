import "client-only";
import type { User } from "firebase/auth";

const local = process.env.NEXT_PUBLIC_WSB_LOCAL_TESTING === "true";
const key = "wsb-local-signed-session";
type LocalSession = { uid: string; token: string; expires_at: number };

export function clearLocalSessionUnless(uid?: string) {
  if (!local) return;
  try {
    const session = JSON.parse(sessionStorage.getItem(key) || "null") as LocalSession | null;
    if (!uid || session?.uid !== uid) sessionStorage.removeItem(key);
  } catch { sessionStorage.removeItem(key); }
}

export async function establishApiSession(user: User, email: string, password: string) {
  if (!local) return;
  clearLocalSessionUnless();
  const result = await user.getIdTokenResult();
  const chapter = result.claims.chapterId;
  // Newly registered accounts still need membership approval.
  if (typeof chapter !== "string" || !chapter) return;
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8088"}/local/session`, {
    method: "POST", cache: "no-store", signal: AbortSignal.timeout(12000),
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, chapter_id: chapter }),
  });
  if (!response.ok) throw new Error("Local test session could not be verified.");
  const session = await response.json() as LocalSession;
  if (session.uid !== user.uid || !session.token || session.expires_at <= Date.now() / 1000) throw new Error("Invalid local session.");
  sessionStorage.setItem(key, JSON.stringify(session));
}

export async function apiToken(user: User) {
  if (!local) return user.getIdToken();
  let session: LocalSession | null = null;
  try { session = JSON.parse(sessionStorage.getItem(key) || "null") as LocalSession | null; } catch { /* Require a fresh sign-in. */ }
  if (!session || session.uid !== user.uid || session.expires_at <= Date.now() / 1000 + 10) {
    clearLocalSessionUnless();
    throw new Error("Your local test session expired. Sign in again.");
  }
  return session.token;
}
