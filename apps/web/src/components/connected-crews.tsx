"use client";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useWorkspaceSession, type WorkspaceSession } from "@/lib/account";
import { ApiError, connectedPage, connectedRequest, segment } from "@/lib/connected-api";
import type { Crew, CrewInvitation } from "@/lib/api";
import { PageHeading } from "./ui";
import { registrationCommand } from "@/lib/registration-command";

function AccessMessage({ loading, error }: { loading: boolean; error: string }) {
  return loading ? <p role="status">Checking chapter access…</p> : error ? <p className="form-error" role="alert">{error}</p> : <Link className="button button-volt" href="/sign-in">Sign in to continue</Link>;
}

export function ConnectedCrews({ crewId, create = false, overview = false }: { crewId?: string; create?: boolean; overview?: boolean }) {
  const { session, loading, error: sessionError } = useWorkspaceSession();
  if (!session) return <main id="main-content" className="workspace-main"><PageHeading title={create ? "Create your crew" : crewId ? "Crew details" : "Your crews"} description="Chapter access and crew membership are verified by the server." /><div className="connected-stack"><AccessMessage loading={loading} error={sessionError} /></div></main>;
  return <CrewWorkspace key={JSON.stringify([session.uid, session.chapter_id, crewId ?? null, create])} session={session} crewId={crewId} create={create} overview={overview} />;
}

type InvitationSummary = { id: string; crew_id: string; issued_at: number; expires_at: number; used: boolean; revoked: boolean };
function CrewInvitations({ chapter, crewId, uid, onRevoked, onAccessDenied }: { chapter: string; crewId: string; uid: string; onRevoked: () => void; onAccessDenied: () => void }) {
  const [items, setItems] = useState<InvitationSummary[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const load = useCallback(async (next: string | null = null) => {
    const current = ++generation.current; setBusy(true); setError("");
    try {
      const page = await connectedPage<InvitationSummary>(`/v1/chapters/${segment(chapter)}/crews/${segment(crewId)}/invitations`, next, uid);
      if (!Array.isArray(page.items) || page.items.length > 100 || page.items.some(row => !row || !/^[a-f0-9]{64}$/.test(row.id) || row.crew_id !== crewId || !Number.isSafeInteger(row.issued_at) || row.issued_at <= 0 || !Number.isFinite(new Date(row.issued_at * 1000).getTime()) || !Number.isSafeInteger(row.expires_at) || row.expires_at <= 0 || !Number.isFinite(new Date(row.expires_at * 1000).getTime()) || typeof row.used !== "boolean" || typeof row.revoked !== "boolean") || !(page.next_page === null || (typeof page.next_page === "string" && page.next_page.length > 0 && page.next_page.length <= 4096))) throw new Error("Invitation history could not be verified.");
      const ids = page.items.map(row => row.id);
      if (new Set(ids).size !== ids.length || ids.some((id, index) => index > 0 && ids[index - 1] >= id) ||
        (next !== null && ids.some(id => id <= next)) ||
        (page.next_page !== null && (page.items.length === 0 || page.next_page !== ids[ids.length - 1]))) throw new Error("Invitation history continuation could not be verified. Refresh the list.");
      if (current === generation.current) { setItems(previous => next ? [...previous, ...page.items.filter(row => !previous.some(item => item.id === row.id))] : page.items); setCursor(page.next_page); }
    } catch (cause) { if (current === generation.current) { setItems([]); setCursor(null); if (cause instanceof ApiError && [401, 403].includes(cause.status)) onAccessDenied(); setError(cause instanceof Error ? cause.message : "Unable to load invitations."); } }
    finally { if (current === generation.current) setBusy(false); }
  }, [chapter, crewId, uid, onAccessDenied]);
  useEffect(() => { void load(); return () => { generation.current++; }; }, [load]);
  async function revoke(id: string) {
    const current = ++generation.current; setBusy(true); setError("");
    try {
      const result = await registrationCommand<{ crew_id: string; revoked: boolean }>(`/v1/chapters/${segment(chapter)}/crews/${segment(crewId)}/invitations/revoke`, { invitation_id: id }, "POST", false, uid);
      if (result.crew_id !== crewId || result.revoked !== true) throw new Error("Invitation revocation could not be verified.");
      if (current === generation.current) { setItems(previous => previous.map(row => row.id === id ? { ...row, revoked: true } : row)); onRevoked(); }
    } catch (cause) { if (current === generation.current) { if (cause instanceof ApiError && [401, 403].includes(cause.status)) { setItems([]); setCursor(null); onAccessDenied(); } setError(cause instanceof ApiError && cause.status === 409 ? "This invitation changed or has been used. Refresh the list to see its current status." : cause instanceof Error ? cause.message : "Unable to revoke invitation."); } }
    finally { if (current === generation.current) setBusy(false); }
  }
  return <section aria-label="Invitation history"><h3>Invitation history</h3><p className="fineprint">Links cannot be recovered from this list. Each page checks the current crew manager and lists this crew’s invitations.</p>
    {items.map(row => <div key={row.id}><p>Issued {new Date(row.issued_at * 1000).toLocaleString()} · Expires {new Date(row.expires_at * 1000).toLocaleString()} · {row.used ? "Used" : row.revoked ? "Revoked" : row.expires_at * 1000 <= Date.now() ? "Expired" : "Available"}</p>{!row.used && !row.revoked && <button type="button" disabled={busy} className="button button-outline" onClick={() => void revoke(row.id)}>Revoke invitation</button>}</div>)}
    {!items.length && !busy && !error && <p>No invitations on the loaded pages.</p>}{busy && <p role="status">Loading or updating invitations…</p>}{error && <p role="alert" className="form-error">{error}</p>}
    {cursor && <button type="button" disabled={busy} className="button button-outline" onClick={() => void load(cursor)}>Load more invitations</button>} <button type="button" disabled={busy} className="button button-outline" onClick={() => void load()}>Refresh invitations</button>
  </section>;
}

function CrewWorkspace({ session, crewId, create, overview }: { session: WorkspaceSession; crewId?: string; create: boolean; overview: boolean }) {
  const [crews, setCrews] = useState<Crew[]>([]);
  const [crew, setCrew] = useState<Crew | null>(null);
  const [name, setName] = useState(""); const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [invitation, setInvitation] = useState("");
  const [invitationExpiry, setInvitationExpiry] = useState(0);
  const [invitationToken, setInvitationToken] = useState("");
  const [inviteNotice, setInviteNotice] = useState("");
  const [invitationListVersion, setInvitationListVersion] = useState(0);
  const clearCrewAccess = useCallback(() => { setCrew(null); setInvitation(""); setInvitationToken(""); setError("Your crew access is no longer available. Refresh or sign in again."); }, []);
  const [cursor, setCursor] = useState<string | null>(null);
  const generation = useRef(0);
  const router = useRouter();
  const load = useCallback(async (next?: string | null) => {
    if (!session || create) return;
    const current = ++generation.current;
    setBusy(true); setError("");
    try {
      const path = `/v1/chapters/${segment(session.chapter_id)}/crews`;
      if (crewId) {
        const result = await connectedRequest<Crew>(`${path}/${segment(crewId)}`, undefined, "GET", session.uid);
        if (result.id !== crewId || result.chapter_id !== session.chapter_id || !Array.isArray(result.members)) throw new Error("Crew response could not be verified for this chapter.");
        if (current === generation.current) setCrew(result);
      } else {
        const page = await connectedPage<Crew>(path, next, session.uid);
        if (!Array.isArray(page.items) || page.items.some(item => !item.id || item.chapter_id !== session.chapter_id || !Array.isArray(item.members)) ||
          (page.next_page !== null && typeof page.next_page !== "string")) throw new Error("Crew list response could not be verified for this chapter.");
        if (current === generation.current) { setCrews(previous => next ? [...previous, ...page.items] : page.items); setCursor(page.next_page); }
      }
    } catch (reason) { if (current === generation.current) { if (reason instanceof ApiError && [401, 403].includes(reason.status)) { setCrew(null); setCrews([]); setCursor(null); setInvitation(""); setInvitationToken(""); } setError(reason instanceof Error ? reason.message : "Unable to load crews."); } }
    finally { if (current === generation.current) setBusy(false); }
  }, [session, create, crewId]);
  useEffect(() => { void load(); return () => { generation.current++; }; }, [load]);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!session) return;
    const current = ++generation.current;
    setBusy(true); setError("");
    try {
      const result = await registrationCommand<Crew>(`/v1/chapters/${segment(session.chapter_id)}/crews`, { name, city }, "POST", false, session.uid);
      if (!result.id || result.chapter_id !== session.chapter_id || result.manager_uid !== session.uid) throw new Error("Created crew response could not be verified for this account.");
      if (current === generation.current) router.push(`/app/crews/${segment(result.id)}`);
    } catch (reason) { if (current === generation.current) setError(reason instanceof Error ? reason.message : "Unable to create crew."); }
    finally { if (current === generation.current) setBusy(false); }
  }
  async function invite() {
    if (!session || !crew) return;
    const current = ++generation.current;
    setBusy(true); setError("");
    try {
      const result = await registrationCommand<CrewInvitation>(`/v1/chapters/${segment(session.chapter_id)}/crews/${segment(crew.id)}/invitations`, {}, "POST", false, session.uid);
      if (result.crew_id !== crew.id || result.chapter_id !== session.chapter_id || result.inviter_uid !== session.uid || !/^[A-Za-z0-9_-]{32,128}$/.test(result.token) || !Number.isSafeInteger(result.expires_at) || result.expires_at <= 0 || !Number.isFinite(new Date(result.expires_at * 1000).getTime())) throw new Error("Invitation response could not be verified for this crew.");
      if (current === generation.current) { setInvitation(`${window.location.origin}/invite/accept?chapter=${segment(session.chapter_id)}&crew=${segment(crew.id)}#${result.token}`); setInvitationExpiry(result.expires_at); setInvitationToken(result.token); setInviteNotice(""); setInvitationListVersion(value => value + 1); }
    } catch (reason) { if (current === generation.current) { if (reason instanceof ApiError && [401, 403].includes(reason.status)) { setCrew(null); setInvitation(""); setInvitationToken(""); } setError(reason instanceof Error ? reason.message : "Unable to create invitation."); } }
    finally { if (current === generation.current) setBusy(false); }
  }
  async function revokeInvite() {
    if (!crew || !invitationToken || busy) return;
    const current = ++generation.current; setBusy(true); setError(""); setInviteNotice("");
    try {
      const result = await registrationCommand<{ crew_id: string; revoked: boolean }>(`/v1/chapters/${segment(session.chapter_id)}/crews/${segment(crew.id)}/invitations/revoke`, { token: invitationToken }, "POST", false, session.uid);
      if (result.crew_id !== crew.id || result.revoked !== true) throw new Error("Invitation revocation could not be verified.");
      if (current === generation.current) { setInvitation(""); setInvitationToken(""); setInviteNotice("Invitation revoked. Its link and QR can no longer be used."); setInvitationListVersion(value => value + 1); }
    } catch (cause) { if (current === generation.current) { if (cause instanceof ApiError && [401, 403].includes(cause.status)) { setCrew(null); setInvitation(""); setInvitationToken(""); } setError(cause instanceof Error ? cause.message : "Unable to revoke the invitation."); } }
    finally { if (current === generation.current) setBusy(false); }
  }
  return <main id="main-content" className="workspace-main"><PageHeading title={overview ? "Your workspace" : create ? "Create your crew" : crewId ? crew?.name || "Crew details" : "Your crews"} description="Chapter access and crew membership are verified by the server." /><div className="connected-stack">
      {overview && <section className="panel" aria-labelledby="workspace-next-heading"><h2 id="workspace-next-heading">Where would you like to start?</h2><p>{session.role === "crew_manager" ? "Manage your crew, then find an event to prepare an entry." : session.role === "dancer" ? "Check your crew invitations and personal requests." : session.role === "guardian" ? "Review requests for the dancers in your care." : "Open your assigned workspace or check your account updates."}</p><div className="connected-actions">{session.role === "crew_manager" ? <Link className="button button-volt" href="/events">Find an event</Link> : session.role === "guardian" ? <Link className="button button-volt" href="/app/dependents">Review dependents</Link> : session.role === "dancer" ? <Link className="button button-volt" href="/app/notifications">View notifications</Link> : <Link className="button button-volt" href="/workspaces">Open assigned workspaces</Link>}{session.role !== "dancer" && <Link className="button button-outline" href="/app/notifications">Notifications</Link>}</div><p className="fineprint">Available actions depend on your current chapter access and event assignment.</p></section>}
    <>
      {create ? <form className="panel" onSubmit={submit}><p>Chapter: <strong>{session.chapter_id.toUpperCase()}</strong></p><label htmlFor="crew-name">Crew name<input id="crew-name" required maxLength={120} value={name} onChange={e => setName(e.target.value)} /></label><label htmlFor="crew-city">Home city<input id="crew-city" maxLength={120} value={city} onChange={e => setCity(e.target.value)} /></label><button className="button button-volt" disabled={busy || session.role !== "crew_manager"}>{busy ? "Creating…" : "Create crew"}</button>{session.role !== "crew_manager" && <p>Your chapter organizer must assign the crew manager role before you create a crew.</p>}</form> : crewId ? crew && <section className="panel"><p>{crew.city} · {crew.chapter_id.toUpperCase()}</p><h2>Roster</h2><ul>{crew.members.map(member => <li key={member.uid}>{member.name} · {member.role}{member.is_minor ? member.consent_verified ? " · Guardian consent verified" : " · Guardian consent pending" : ""}</li>)}</ul>{crew.manager_uid === session.uid && <button className="button button-volt" disabled={busy} onClick={invite}>Create dancer invitation</button>}{invitation && <div><label htmlFor="crew-invite">One-use invitation link<input id="crew-invite" value={invitation} readOnly onFocus={e => e.target.select()} /></label><p className="field-help">Expires {new Date(invitationExpiry * 1000).toLocaleString()}. Share only with the intended dancer; anyone with this code can use the invitation once.</p><div style={{background:"white", display:"inline-block", padding:16}}><QRCodeSVG value={invitation} size={200} level="M" title="One-use dancer invitation QR code" /></div><p className="fineprint">The dancer can scan this code to open the same invitation link.</p><button type="button" className="button button-outline" disabled={busy} onClick={() => void revokeInvite()}>Revoke this invitation</button></div>}{crew.manager_uid === session.uid && <CrewInvitations key={invitationListVersion} chapter={session.chapter_id} crewId={crew.id} uid={session.uid} onRevoked={() => { setInvitation(""); setInvitationToken(""); }} onAccessDenied={clearCrewAccess} />}</section> : <>
        {session.role === "crew_manager" && <Link className="button button-volt" href="/app/crews/new">Create crew</Link>}
        {busy ? <p role="status">Loading crews…</p> : crews.length === 0 && !error ? <p>No crew memberships yet. Create your crew or open a dancer invitation.</p> : crews.map(item => <section className="panel" key={item.id}><h2>{item.name}</h2><p>{item.city} · {item.members.length} members</p><Link className="text-link" href={`/app/crews/${segment(item.id)}`}>Open crew</Link></section>)}
      </>}
      {!crewId && cursor && <button className="button button-outline" disabled={busy} onClick={() => void load(cursor)}>Load more crews</button>}
      {error && <p className="form-error" role="alert">{error}</p>}{inviteNotice && <p role="status">{inviteNotice}</p>}{!create && <button className="button button-outline" disabled={busy} onClick={() => void load()}>Refresh</button>}
    </>
  </div></main>;
}
