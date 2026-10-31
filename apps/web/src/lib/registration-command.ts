"use client";
import { ApiError, connectedRequest } from "./connected-api";
import { firebaseClient } from "./firebase/client";

// Store only an opaque intent hash and operation ID, never the form's identity data.
// A lost response reuses the same operation ID, including after a page reload.
export async function registrationCommand<T>(path: string, body: Record<string, unknown> = {}, method = "POST", includeFirebaseIdToken = false, expectedUid?: string): Promise<T> {
  const auth = firebaseClient().auth;
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in to continue.");
  if (expectedUid && user.uid !== expectedUid) throw new Error("Your account changed. Sign in again before continuing.");
  const input = new TextEncoder().encode(JSON.stringify([user.uid, path, method, body]));
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", input)), value => value.toString(16).padStart(2, "0")).join("");
  const key = `wsb-registration-intent:${digest}`;
  const id = sessionStorage.getItem(key) || crypto.randomUUID();
  sessionStorage.setItem(key, id);
  try {
    const result = await connectedRequest<T>(path, { ...body, operation_id: id }, method, user.uid, includeFirebaseIdToken);
    sessionStorage.removeItem(key);
    return result;
  } catch (error) {
    if (error instanceof ApiError && [400, 403, 404, 409, 422].includes(error.status)) sessionStorage.removeItem(key);
    throw error;
  }
}
