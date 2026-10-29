import "client-only";
import { firebaseClient } from "./firebase/client";

export async function chapterSession(chapterId: string) {
  const user = firebaseClient().auth.currentUser;
  if (!user) throw new Error("Sign in to continue.");
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/chapters/${encodeURIComponent(chapterId)}/session`, {
    headers: { Authorization: `Bearer ${await user.getIdToken()}` },
    cache: "no-store", signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(response.status === 403 ? "You do not have access to this chapter." : "Unable to verify your session.");
  return response.json() as Promise<{ uid: string; chapter_id: string; role: string }>;
}
