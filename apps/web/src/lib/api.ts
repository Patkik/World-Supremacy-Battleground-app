import "client-only";
import { firebaseClient } from "./firebase/client";
import { apiToken } from "./firebase/api-session";

export function resolveApiBase(): string {
  if (typeof window !== "undefined") {
    if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      return "";
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8088";
}
const API_BASE = resolveApiBase();

export type AccountChapter = {
  chapter_id: string;
  chapter_name: string;
  role: string;
};

export type AccountChapterPage = {
  items: AccountChapter[];
  next_page: string | null;
};

export async function accountChapterPage(cursor?: string | null, expectedUid?: string): Promise<AccountChapterPage> {
  const user = firebaseClient().auth.currentUser;
  if (!user) throw new Error("Sign in to choose a chapter.");
  if (expectedUid && user.uid !== expectedUid) throw new Error("The signed-in account changed. Reload chapter selection.");
  const token = await apiToken(user);
  if (firebaseClient().auth.currentUser?.uid !== user.uid) throw new Error("The signed-in account changed. Reload chapter selection.");
  const query = new URLSearchParams({ limit: "100" });
  if (cursor) query.set("cursor", cursor);
  const response = await fetch(`${API_BASE}/v1/account/chapters?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (firebaseClient().auth.currentUser?.uid !== user.uid) throw new Error("The signed-in account changed. Reload chapter selection.");
  if (!response.ok) throw new Error(response.status === 501
    ? "Chapter selection is not available in this storage mode."
    : "Your chapter memberships could not be loaded.");
  const page = await response.json() as AccountChapterPage;
  if (!Array.isArray(page.items) || !(page.next_page === null || typeof page.next_page === "string")) {
    throw new Error("The chapter membership response was invalid.");
  }
  return page;
}

export async function chapterSession(chapterId: string) {
  const user = firebaseClient().auth.currentUser;
  if (!user) throw new Error("Sign in to continue.");
  const response = await fetch(`${API_BASE}/v1/chapters/${encodeURIComponent(chapterId)}/session`, {
    headers: { Authorization: `Bearer ${await apiToken(user)}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    throw new Error(
      response.status === 403
        ? "You do not have current access to this chapter. Choose another workspace at /workspaces."
        : "Unable to verify your session."
    );
  }
  const session = await response.json() as { uid: string; chapter_id: string; role: string };
  if (session.uid !== user.uid || session.chapter_id !== chapterId) {
    throw new Error("The chapter session did not match the selected account and chapter.");
  }
  return session;
}

export class HqSessionError extends Error {
  constructor(public readonly status: number) {
    super(status === 403 ? "This account has no active Global HQ membership." : "Unable to verify Global HQ access.");
    this.name = "HqSessionError";
  }
}

export async function globalHqSession() {
  const user = firebaseClient().auth.currentUser;
  if (!user) throw new HqSessionError(401);
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/v1/hq/session`, {
      headers: { Authorization: `Bearer ${await apiToken(user)}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new HqSessionError(0);
  }
  if (!response.ok) throw new HqSessionError(response.status);
  const session = await response.json() as { uid: string; role: string };
  if (session.uid !== user.uid || session.role !== "hq_admin") throw new HqSessionError(403);
  return session;
}

export interface Division {
  id: string;
  name: string;
  min_members: number;
  max_members: number;
  max_duration_secs: number;
  max_age?: number;
  fee_minor: number;
}

export interface CrewMember {
  uid: string;
  name: string;
  role: "Manager" | "Dancer";
  is_minor: boolean;
  consent_verified: boolean;
}

export interface Crew {
  revision?: number;
  id: string;
  chapter_id: string;
  name: string;
  city: string;
  manager_uid: string;
  members: CrewMember[];
  created_at: number;
}

export interface CrewInvitation {
  token: string;
  crew_id: string;
  chapter_id: string;
  inviter_uid: string;
  role: "Manager" | "Dancer";
  expires_at: number;
  used: boolean;
}

export interface EntryReadiness {
  roster_ready: boolean;
  roster_count: number;
  min_required: number;
  max_allowed: number;
  music_ready: boolean;
  consent_ready: boolean;
  payment_ready: boolean;
  is_ready: boolean;
  diagnostics: string[];
}

export interface Entry {
  rules_version?: string;
  revision?: number;
  id: string;
  chapter_id: string;
  event_id: string;
  crew_id: string;
  division_id: string;
  roster: CrewMember[];
  track_filename?: string;
  track_duration_secs?: number;
  paid_minor: number;
  status: "draft" | "submitted" | "needs_correction" | "approved" | "withdrawn";
  created_at: number;
  updated_at: number;
}

export interface EntryDetailResponse {
  pending_minor?: number;
  entry: Entry;
  readiness: EntryReadiness;
}

export interface PaymentQuote {
  paid_amount_minor?: number;
  pending_amount_minor?: number;
  outstanding_amount_minor?: number;
  available_amount_minor?: number;
  entry_id: string;
  division_name: string;
  dancer_count: number;
  rate_per_dancer_minor: number;
  total_amount_minor: number;
  currency: string;
}

export interface PaymentRecord {
  payment_id: string;
  chapter_id: string;
  entry_id: string;
  payer_uid: string;
  amount_minor: number;
  currency: string;
  status: "pending" | "settled" | "failed" | "refunded";
  provider_reference: string;
  created_at: number;
  settled_at?: number;
}
