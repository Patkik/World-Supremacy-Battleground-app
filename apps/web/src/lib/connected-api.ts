"use client";
import { firebaseClient } from "./firebase/client";
import { apiToken } from "./firebase/api-session";

import { resolveApiBase } from "./api";

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export const apiBase = resolveApiBase();
export const segment = encodeURIComponent;
export type ApiPage<T> = { items: T[]; next_page: string | null };
export async function connectedPage<T>(path: string, cursor?: string | null, expectedUid?: string): Promise<ApiPage<T>> {
  const result = await connectedRequest<ApiPage<T> | T[]>(`${path}${cursor ? `?cursor=${segment(cursor)}` : ""}`, undefined, "GET", expectedUid);
  return Array.isArray(result) ? { items: result, next_page: null } : result;
}

export async function connectedRequest<T>(path: string, body?: unknown, method = body === undefined ? "GET" : "POST", expectedUid?: string, includeFirebaseIdToken = false): Promise<T> {
  const auth = firebaseClient().auth;
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user || (expectedUid && user.uid !== expectedUid)) throw new ApiError(401, "Sign in with the account that saved this score.");
  const response = await fetch(`${apiBase}${path}`, {
    method, body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store", signal: AbortSignal.timeout(12000),
    headers: { Authorization: `Bearer ${await apiToken(user)}`, ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...(includeFirebaseIdToken ? { "X-Firebase-ID-Token": await user.getIdToken() } : {}) },
  });
  if (!response.ok) throw new ApiError(response.status, response.status === 409 ? "The record changed or is locked. Review it before retrying." : response.status === 403 ? "Your account does not have access to this action." : response.status === 401 ? "Your session expired. Sign in again." : response.status === 404 ? "This record was not found in your event." : "The request could not be completed. Please try again.");
  return response.json() as Promise<T>;
}
