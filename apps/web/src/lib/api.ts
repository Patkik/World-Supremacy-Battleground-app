import "client-only";
import { firebaseClient } from "./firebase/client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8088";

export async function chapterSession(chapterId: string) {
  const user = firebaseClient().auth.currentUser;
  if (!user) throw new Error("Sign in to continue.");
  const response = await fetch(`${API_BASE}/v1/chapters/${encodeURIComponent(chapterId)}/session`, {
    headers: { Authorization: `Bearer ${await user.getIdToken()}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    throw new Error(
      response.status === 403
        ? "You do not have access to this chapter."
        : "Unable to verify your session."
    );
  }
  return response.json() as Promise<{ uid: string; chapter_id: string; role: string }>;
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
  entry: Entry;
  readiness: EntryReadiness;
}

export async function fetchDivisions(chapterId: string, eventId: string): Promise<Division[]> {
  try {
    const res = await fetch(`${API_BASE}/v1/chapters/${chapterId}/events/${eventId}/divisions`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Return standard fallback divisions
  }
  return [
    { id: "open-crew", name: "Open Crew", min_members: 5, max_members: 14, max_duration_secs: 180, fee_minor: 120000 },
    { id: "monster-crew", name: "Monster Crew", min_members: 20, max_members: 40, max_duration_secs: 240, fee_minor: 100000 },
    { id: "varsity-ignite", name: "Varsity Ignite (14&U)", min_members: 5, max_members: 18, max_duration_secs: 150, max_age: 14, fee_minor: 110000 },
    { id: "monster-varsity", name: "Monster Varsity (18&U)", min_members: 10, max_members: 30, max_duration_secs: 180, max_age: 18, fee_minor: 110000 },
    { id: "junior", name: "Junior (12&U)", min_members: 5, max_members: 14, max_duration_secs: 150, max_age: 12, fee_minor: 100000 },
  ];
}

export async function createCrew(
  chapterId: string,
  token: string,
  name: string,
  city: string
): Promise<Crew> {
  const res = await fetch(`${API_BASE}/v1/chapters/${chapterId}/crews`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, city }),
  });
  if (!res.ok) {
    throw new Error(`Failed to create crew: ${res.statusText}`);
  }
  return await res.json();
}

export async function createInvitation(
  chapterId: string,
  token: string,
  crewId: string
): Promise<CrewInvitation> {
  const res = await fetch(`${API_BASE}/v1/chapters/${chapterId}/crews/${crewId}/invitations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to create invitation: ${res.statusText}`);
  }
  return await res.json();
}

export async function acceptInvitation(
  chapterId: string,
  token: string,
  invitationToken: string,
  dancerName: string,
  isMinor: boolean
): Promise<Crew> {
  const res = await fetch(`${API_BASE}/v1/chapters/${chapterId}/crews/join`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      token: invitationToken,
      dancer_name: dancerName,
      is_minor: isMinor,
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to join crew: ${res.statusText}`);
  }
  return await res.json();
}

export async function createEntry(
  chapterId: string,
  token: string,
  eventId: string,
  crewId: string,
  divisionId: string
): Promise<Entry> {
  const res = await fetch(`${API_BASE}/v1/chapters/${chapterId}/events/${eventId}/entries`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ crew_id: crewId, division_id: divisionId }),
  });
  if (!res.ok) {
    throw new Error(`Failed to create entry: ${res.statusText}`);
  }
  return await res.json();
}

export async function getEntryDetail(
  chapterId: string,
  token: string,
  eventId: string,
  entryId: string
): Promise<EntryDetailResponse> {
  const res = await fetch(`${API_BASE}/v1/chapters/${chapterId}/events/${eventId}/entries/${entryId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to retrieve entry: ${res.statusText}`);
  }
  return await res.json();
}

export async function submitEntry(
  chapterId: string,
  token: string,
  eventId: string,
  entryId: string
): Promise<Entry> {
  const res = await fetch(`${API_BASE}/v1/chapters/${chapterId}/events/${eventId}/entries/${entryId}/submit`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to submit entry: ${res.statusText}`);
  }
  return await res.json();
}

export async function fetchCrews(chapterId: string): Promise<Crew[]> {
  try {
    const res = await fetch(`${API_BASE}/v1/chapters/${chapterId}/crews`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }
  return [
    {
      id: "crew-afterhours",
      chapter_id: chapterId,
      name: "Afterhours Collective",
      city: "Manila",
      manager_uid: "dev-manager-1",
      members: [
        { uid: "dev-manager-1", name: "Kenji Ramos (Manager)", role: "Manager", is_minor: false, consent_verified: true },
        { uid: "dancer-1", name: "Jolo Santos", role: "Dancer", is_minor: false, consent_verified: true },
        { uid: "dancer-2", name: "Bea dela Cruz", role: "Dancer", is_minor: false, consent_verified: true },
        { uid: "dancer-3", name: "Mateo Tan", role: "Dancer", is_minor: false, consent_verified: true },
        { uid: "dancer-4", name: "Ria Reyes", role: "Dancer", is_minor: false, consent_verified: true },
        { uid: "dancer-5", name: "Carlo Lim", role: "Dancer", is_minor: true, consent_verified: true },
      ],
      created_at: 1700000000,
    },
  ];
}

export async function fetchCrew(chapterId: string, crewId: string, token: string): Promise<Crew> {
  const res = await fetch(`${API_BASE}/v1/chapters/${chapterId}/crews/${crewId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to retrieve crew: ${res.statusText}`);
  }
  return await res.json();
}

export async function updateCrew(
  chapterId: string,
  token: string,
  crewId: string,
  name: string,
  city: string
): Promise<Crew> {
  const res = await fetch(`${API_BASE}/v1/chapters/${chapterId}/crews/${crewId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, city }),
  });
  if (!res.ok) {
    throw new Error(`Failed to update crew: ${res.statusText}`);
  }
  return await res.json();
}

export async function fetchEntries(chapterId: string, eventId: string, token: string): Promise<Entry[]> {
  const res = await fetch(`${API_BASE}/v1/chapters/${chapterId}/events/${eventId}/entries`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to list entries: ${res.statusText}`);
  }
  return await res.json();
}

export async function updateEntryRoster(
  chapterId: string,
  token: string,
  eventId: string,
  entryId: string,
  roster: CrewMember[]
): Promise<Entry> {
  const res = await fetch(`${API_BASE}/v1/chapters/${chapterId}/events/${eventId}/entries/${entryId}/roster`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ roster }),
  });
  if (!res.ok) {
    throw new Error(`Failed to update roster: ${res.statusText}`);
  }
  return await res.json();
}

export async function reviewEntry(
  chapterId: string,
  token: string,
  eventId: string,
  entryId: string,
  status: "approved" | "needs_correction"
): Promise<Entry> {
  const res = await fetch(`${API_BASE}/v1/chapters/${chapterId}/events/${eventId}/entries/${entryId}/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    throw new Error(`Failed to review entry: ${res.statusText}`);
  }
  return await res.json();
}

export async function fetchChapters(): Promise<Array<{ id: string; name: string; currency: string }>> {
  try {
    const res = await fetch(`${API_BASE}/v1/chapters`);
    if (res.ok) return await res.json();
  } catch {}
  return [
    { id: "ph", name: "WSB Philippines", currency: "PHP" },
    { id: "hk", name: "WSB Hong Kong", currency: "HKD" },
    { id: "au", name: "WSB Australia", currency: "AUD" },
  ];
}

export async function fetchEvents(
  chapterId: string
): Promise<Array<{ id: string; chapter_id: string; name: string; status: string; rules_version: string }>> {
  try {
    const res = await fetch(`${API_BASE}/v1/chapters/${chapterId}/events`);
    if (res.ok) return await res.json();
  } catch {}
  return [
    { id: "manila-session-2027", chapter_id: "ph", name: "Manila Session 2027", status: "active", rules_version: "2027.1" },
    { id: "hk-championship-2027", chapter_id: "hk", name: "Hong Kong World Championship 2027", status: "active", rules_version: "2027.1" },
  ];
}

export interface PaymentQuote {
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

export interface FinanceSummary {
  chapter_id: string;
  total_settled_minor: number;
  total_pending_minor: number;
  total_refunded_minor: number;
  currency: string;
  transaction_count: number;
}

export interface VerificationCase {
  case_id: string;
  chapter_id: string;
  dancer_uid: string;
  dancer_name: string;
  is_minor: boolean;
  status: "pending" | "approved" | "rejected";
  document_type: string;
  submitted_at: number;
  reviewed_at?: number;
  reviewer_note?: string;
}

export async function fetchPaymentQuote(
  chapterId: string,
  token: string,
  eventId: string,
  entryId: string
): Promise<PaymentQuote> {
  const res = await fetch(`${API_BASE}/v1/chapters/${chapterId}/events/${eventId}/entries/${entryId}/quote`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to get payment quote: ${res.statusText}`);
  }
  return await res.json();
}

export async function submitPayment(
  chapterId: string,
  token: string,
  eventId: string,
  entryId: string,
  providerReference: string
): Promise<PaymentRecord> {
  const res = await fetch(`${API_BASE}/v1/chapters/${chapterId}/events/${eventId}/entries/${entryId}/pay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ provider_reference: providerReference }),
  });
  if (!res.ok) {
    throw new Error(`Failed to process payment: ${res.statusText}`);
  }
  return await res.json();
}

export async function fetchFinanceSummary(chapterId: string, token: string): Promise<FinanceSummary> {
  const res = await fetch(`${API_BASE}/v1/chapters/${chapterId}/finance/summary`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch finance summary: ${res.statusText}`);
  }
  return await res.json();
}

export async function fetchPayments(chapterId: string, token: string): Promise<PaymentRecord[]> {
  const res = await fetch(`${API_BASE}/v1/chapters/${chapterId}/finance/payments`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to list payments: ${res.statusText}`);
  }
  return await res.json();
}

export async function fetchVerificationCases(chapterId: string, token: string): Promise<VerificationCase[]> {
  const res = await fetch(`${API_BASE}/v1/chapters/${chapterId}/verification`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch verification cases: ${res.statusText}`);
  }
  return await res.json();
}

export async function submitVerificationCase(
  chapterId: string,
  token: string,
  dancerName: string,
  isMinor: boolean,
  documentType: string
): Promise<VerificationCase> {
  const res = await fetch(`${API_BASE}/v1/chapters/${chapterId}/verification`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      dancer_name: dancerName,
      is_minor: isMinor,
      document_type: documentType,
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to submit verification: ${res.statusText}`);
  }
  return await res.json();
}

export async function reviewVerificationCase(
  chapterId: string,
  token: string,
  caseId: string,
  status: "approved" | "rejected",
  note?: string
): Promise<VerificationCase> {
  const res = await fetch(`${API_BASE}/v1/chapters/${chapterId}/verification/${caseId}/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status, note }),
  });
  if (!res.ok) {
    throw new Error(`Failed to review verification case: ${res.statusText}`);
  }
  return await res.json();
}
