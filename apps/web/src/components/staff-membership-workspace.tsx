"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { PageHeading, Status } from "@/components/ui";
import { useWorkspaceSession } from "@/lib/account";
import { ApiError, connectedPage, segment } from "@/lib/connected-api";
import { registrationCommand } from "@/lib/registration-command";

type Session = { uid: string; chapter_id: string; role: string };
type StaffMember = {
  uid: string;
  chapter_id: string;
  role: string;
  active: boolean;
  valid_after: number;
  revision: number;
  expires_at: number | null;
};
type StaffInvitation = {
  id: string;
  chapter_id: string;
  target_uid: string;
  role: string;
  created_by: string;
  created_at: number;
  expires_at: number;
  access_expires_at: number;
  active: boolean;
  revision: number;
  reason: string;
  accepted_at: number | null;
};
type EventAssignment = { uid: string; event_id: string; active: boolean; revision: number; reason: string; changed_at: number };
type PendingInvitation = { target_uid: string; role: string; reason: string; access_expires_at: number; invite_code: string };
const roles = ["registrar", "finance", "verifier", "support", "head_judge", "judge", "marshal", "audio_operator", "auditor"];

function validMember(value: unknown, chapterId: string): value is StaffMember {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<StaffMember>;
  return item.chapter_id === chapterId && typeof item.uid === "string" && item.uid.length > 0
    && [...roles, "chapter_director"].includes(item.role ?? "") && typeof item.active === "boolean"
    && Number.isSafeInteger(item.revision) && (item.revision ?? -1) >= 0
    && Number.isFinite(item.valid_after) && (item.expires_at === null || Number.isFinite(item.expires_at));
}

function validInvitation(value: unknown, chapterId: string): value is StaffInvitation {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<StaffInvitation>;
  return typeof item.id === "string" && item.id.length > 0 && item.chapter_id === chapterId
    && typeof item.target_uid === "string" && item.target_uid.length > 0 && roles.includes(item.role ?? "")
    && typeof item.created_by === "string" && typeof item.active === "boolean"
    && typeof item.reason === "string" && Number.isSafeInteger(item.revision) && (item.revision ?? -1) >= 0
    && Number.isFinite(item.created_at) && Number.isFinite(item.expires_at) && Number.isFinite(item.access_expires_at)
    && (item.accepted_at === null || Number.isFinite(item.accepted_at));
}

export function StaffMembershipWorkspace({ chapterId }: { chapterId: string }) {
  const { session, loading, error } = useWorkspaceSession(chapterId);
  if (loading) return <main id="main-content" className="workspace-main"><PageHeading eyebrow={`Chapter access / ${chapterId.toUpperCase()}`} title="Staff & chapter access" description="Grant time-limited chapter roles to existing WSB accounts and assign active staff to an event."/><p role="status">Checking chapter access…</p></main>;
  if (!session) return <main id="main-content" className="workspace-main"><PageHeading title="Staff & chapter access" description="Manage current chapter roles and event assignments."/><section className="panel"><p role="alert" className="form-error">{error || "Sign in with an authorized chapter account to continue."}</p><Link className="button button-outline" href={`/sign-in?next=${encodeURIComponent(`/admin/${chapterId}/staff`)}`}>Sign in</Link></section></main>;
  if (session.chapter_id !== chapterId || session.role !== "chapter_director") return <main id="main-content" className="workspace-main"><PageHeading title="Staff & chapter access" description="Manage current chapter roles and event assignments."/><p role="alert" className="form-error">Only the active chapter director can manage access for this chapter.</p></main>;
  return <StaffMembershipManager key={`${session.uid}:${chapterId}`} chapterId={chapterId} session={session}/>;
}

function StaffMembershipManager({ chapterId, session: workspaceSession }: { chapterId: string; session: Session }) {
  const session = workspaceSession;
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [uid, setUid] = useState("");
  const [role, setRole] = useState(roles[0]);
  const [expiresAt, setExpiresAt] = useState("");
  const [reason, setReason] = useState("");
  const [inviteTargetUid, setInviteTargetUid] = useState("");
  const [inviteRole, setInviteRole] = useState(roles[0]);
  const [inviteAccessExpiry, setInviteAccessExpiry] = useState("");
  const [inviteReason, setInviteReason] = useState("");
  const [invitations, setInvitations] = useState<StaffInvitation[]>([]);
  const [invitationCursor, setInvitationCursor] = useState<string | null>(null);
  const [pendingInvitation, setPendingInvitation] = useState<PendingInvitation | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [eventId, setEventId] = useState("");
  const [assignments, setAssignments] = useState<EventAssignment[]>([]);
  const [assignmentCursor, setAssignmentCursor] = useState<string | null>(null);
  const [assignmentsLoadedFor, setAssignmentsLoadedFor] = useState("");
  const [assignmentBusy, setAssignmentBusy] = useState(false);
  const [confirmAssignment, setConfirmAssignment] = useState<{ uid: string; active: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async (next?: string | null) => {
    setLoading(true); setError(""); setNotice("");
    try {
      const current = workspaceSession;
      if (current.chapter_id !== chapterId || current.role !== "chapter_director") {
        setMembers([]); setCursor(null); return;
      }
      const page = await connectedPage<StaffMember>(
        `/v1/chapters/${segment(chapterId)}/staff/members`, next, current.uid,
      );
      if (!Array.isArray(page.items) || page.items.some(item => !validMember(item, chapterId))
        || (page.next_page !== null && typeof page.next_page !== "string")) throw new Error("Staff memberships could not be verified for this chapter.");
      setMembers(previous => next ? [...previous, ...page.items] : page.items);
      setCursor(page.next_page);
      if (!next) {
        const invitationPage = await connectedPage<StaffInvitation>(`/v1/chapters/${segment(chapterId)}/staff/invitations`, null, current.uid);
        if (!Array.isArray(invitationPage.items) || invitationPage.items.some(item => !validInvitation(item, chapterId))
          || (invitationPage.next_page !== null && typeof invitationPage.next_page !== "string")) throw new Error("Staff invitations could not be verified for this chapter.");
        setInvitations(invitationPage.items);
        setInvitationCursor(invitationPage.next_page);
        const pendingKey = `wsb:pending-staff-invitation:${current.uid}:${chapterId}`;
        try {
          const saved = sessionStorage.getItem(pendingKey);
          if (saved) {
            const pending = JSON.parse(saved) as PendingInvitation;
            setPendingInvitation(pending);
            setInviteReason(pending.reason);
          }
        } catch { setError("A saved invitation could not be recovered. Clear this tab's site data to continue."); }
      }
    } catch (cause) {
      setMembers([]); setCursor(null);
      setError(cause instanceof Error ? cause.message : "Unable to load current chapter staff.");
    } finally { setLoading(false); }
  }, [chapterId, workspaceSession]);

  function clearPendingInvitation() {
    if (session) sessionStorage.removeItem(`wsb:pending-staff-invitation:${session.uid}:${chapterId}`);
    setPendingInvitation(null);
  }

  async function createInvitation(event: FormEvent) {
    event.preventDefault();
    if (!session) return;
    setBusy(true); setError(""); setNotice(""); setShareUrl("");
    try {
      let pending = pendingInvitation;
      if (!pending) {
        const expiry = Math.floor(new Date(inviteAccessExpiry).getTime() / 1000);
        if (!Number.isFinite(expiry) || expiry <= Date.now() / 1000) {
          setError("Choose a future expiry for staff access."); return;
        }
        const bytes = crypto.getRandomValues(new Uint8Array(32));
        const invite_code = Array.from(bytes, value => value.toString(16).padStart(2, "0")).join("");
        pending = { target_uid: inviteTargetUid.trim(), role: inviteRole, reason: inviteReason.trim(), access_expires_at: expiry, invite_code };
        sessionStorage.setItem(`wsb:pending-staff-invitation:${session.uid}:${chapterId}`, JSON.stringify(pending));
        setPendingInvitation(pending);
        setInviteReason(pending.reason);
      }
      const invitation = await registrationCommand<StaffInvitation>(
        `/v1/chapters/${segment(chapterId)}/staff/invitations`, pending,
        "POST", false, session.uid,
      );
      if (!validInvitation(invitation, chapterId) || invitation.target_uid !== pending.target_uid
        || invitation.role !== pending.role || invitation.created_by !== session.uid) throw new Error("The saved invitation could not be verified for this director and account.");
      clearPendingInvitation();
      setInviteTargetUid(""); setInviteAccessExpiry(""); setInviteReason("");
      if (!invitation.active || invitation.accepted_at || invitation.expires_at <= Date.now() / 1000 || invitation.access_expires_at <= Date.now() / 1000) {
        setInvitations(previous => [invitation, ...previous.filter(item => item.id !== invitation.id)]);
        setNotice("The saved request already resolved, but this invitation is no longer pending. Create a new invitation if access is still needed.");
        return;
      }
      setShareUrl(`${window.location.origin}/staff-invitations/accept#${pending.invite_code}`);
      setInvitations(previous => [invitation, ...previous.filter(item => item.id !== invitation.id)]);
      setNotice("Invitation created. Share this link directly with the intended account; it expires after 7 days and is bound to its UID.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create this staff invitation. The saved request can be retried.");
    } finally { setBusy(false); }
  }

  async function revokeInvitation(invitation: StaffInvitation) {
    if (!session || inviteReason.trim().length < 8) {
      setError("Enter a reason of at least 8 characters before revoking the invitation."); return;
    }
    setBusy(true); setError(""); setNotice("");
    try {
      const saved = await registrationCommand<StaffInvitation>(
        `/v1/chapters/${segment(chapterId)}/staff/invitations/${segment(invitation.id)}/revoke`,
        { expected_revision: invitation.revision, reason: inviteReason.trim() },
        "POST", false, session.uid,
      );
      if (!validInvitation(saved, chapterId) || saved.id !== invitation.id || saved.target_uid !== invitation.target_uid
        || saved.active || saved.accepted_at !== null) throw new Error("The invitation revocation response could not be verified.");
      setInvitations(current => current.map(item => item.id === saved.id ? saved : item));
      setInviteReason("");
      setNotice("Invitation revoked and recorded in the chapter audit log.");
    } catch (cause) {
      setError(cause instanceof ApiError && cause.status === 409
        ? "The invitation changed or was already used. Refresh the current invitations."
        : cause instanceof Error ? cause.message : "Unable to revoke this invitation.");
    } finally { setBusy(false); }
  }

  async function copyInvitationLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setNotice("Invitation link copied.");
    } catch {
      setError("Copy was unavailable. Select and copy the invitation link.");
    }
  }

  async function loadMoreInvitations() {
    if (!invitationCursor) return;
    setBusy(true);
    try {
      const page = await connectedPage<StaffInvitation>(`/v1/chapters/${segment(chapterId)}/staff/invitations`, invitationCursor, session?.uid);
      if (!Array.isArray(page.items) || page.items.some(item => !validInvitation(item, chapterId))
        || (page.next_page !== null && typeof page.next_page !== "string")) throw new Error("Staff invitations could not be verified for this chapter.");
      setInvitations(current => [...current, ...page.items]);
      setInvitationCursor(page.next_page);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load more invitations.");
    } finally { setBusy(false); }
  }

  useEffect(() => { void load(); }, [load]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!session) return;
    const expiry = Math.floor(new Date(expiresAt).getTime() / 1000);
    if (!Number.isFinite(expiry) || expiry <= Date.now() / 1000) {
      setError("Choose a future expiry for this access."); return;
    }
    setBusy(true); setError(""); setNotice("");
    try {
      const current = members.find(member => member.uid === uid.trim());
      const saved = await registrationCommand<StaffMember>(
        `/v1/chapters/${segment(chapterId)}/staff/members/${segment(uid.trim())}`,
        { expected_revision: current?.revision ?? 0, role, active: true, expires_at: expiry, reason: reason.trim() },
        "PUT", false, session.uid,
      );
      if (!validMember(saved, chapterId) || saved.uid !== uid.trim() || saved.role !== role || !saved.active) throw new Error("The chapter access response could not be verified.");
      setUid(""); setExpiresAt(""); setReason("");
      setConfirmRevoke(null);
      await load();
      setNotice("Chapter access saved. The staff member must sign in again before the new access takes effect.");
    } catch (cause) {
      setError(cause instanceof ApiError && cause.status === 401
        ? "This access change requires a fresh sign-in. Sign out, sign in again, then retry."
        : cause instanceof ApiError && cause.status === 422
          ? "The Firebase Auth account could not be found or is disabled. Check the UID and account status."
        : cause instanceof ApiError && cause.status === 409
          ? "The membership changed. Refresh the list and review the current revision before retrying."
          : cause instanceof Error ? cause.message : "Unable to save chapter access.");
    } finally { setBusy(false); }
  }

  async function revoke(member: StaffMember) {
    if (!session || !reason.trim()) {
      setError("Enter a reason before revoking chapter access."); return;
    }
    setBusy(true); setError(""); setNotice("");
    try {
      const saved = await registrationCommand<StaffMember>(
        `/v1/chapters/${segment(chapterId)}/staff/members/${segment(member.uid)}`,
        { expected_revision: member.revision, role: member.role, active: false, expires_at: member.expires_at, reason: reason.trim() },
        "PUT", false, session.uid,
      );
      if (!validMember(saved, chapterId) || saved.uid !== member.uid || saved.role !== member.role || saved.active) throw new Error("The access revocation response could not be verified.");
      setReason("");
      setConfirmRevoke(null);
      await load();
      setNotice("Chapter access revoked. The change is recorded in the chapter audit log.");
    } catch (cause) {
      setError(cause instanceof ApiError && cause.status === 401
        ? "This access change requires a fresh sign-in. Sign out, sign in again, then retry."
        : cause instanceof ApiError && cause.status === 409
          ? "The membership changed. Refresh the list and review the current revision before retrying."
          : cause instanceof Error ? cause.message : "Unable to revoke chapter access.");
    } finally { setBusy(false); }
  }

  async function loadAssignments(next?: string | null) {
    const selectedEvent = eventId.trim();
    if (!selectedEvent) { setError("Enter an event ID to load assignments."); return; }
    setAssignmentBusy(true); setError(""); setNotice("");
    try {
      const page = await connectedPage<EventAssignment>(`/v1/chapters/${segment(chapterId)}/events/${segment(selectedEvent)}/staff/assignments`, next, session?.uid);
      if (!Array.isArray(page.items) || page.items.some(item => item.event_id !== selectedEvent || typeof item.uid !== "string" || typeof item.active !== "boolean" || !Number.isSafeInteger(item.revision) || typeof item.reason !== "string")
        || (page.next_page !== null && typeof page.next_page !== "string")) throw new Error("Event assignments could not be verified for this event.");
      setAssignments(previous => next ? [...previous, ...page.items] : page.items); setAssignmentsLoadedFor(selectedEvent); setAssignmentCursor(page.next_page);
    } catch (cause) {
      setAssignments([]); setAssignmentsLoadedFor(""); setAssignmentCursor(null);
      setError(cause instanceof Error ? cause.message : "Unable to load event assignments.");
    } finally { setAssignmentBusy(false); }
  }

  async function changeAssignment(member: StaffMember) {
    if (!session || !reason.trim() || !assignmentsLoadedFor) {
      setError("Load an event and enter an assignment reason first."); return;
    }
    const current = assignments.find(row => row.uid === member.uid && row.event_id === assignmentsLoadedFor);
    const active = confirmAssignment?.uid === member.uid ? confirmAssignment.active : !current?.active;
    setAssignmentBusy(true); setError(""); setNotice("");
    try {
      const saved = await registrationCommand<EventAssignment>(
        `/v1/chapters/${segment(chapterId)}/events/${segment(assignmentsLoadedFor)}/staff/assignments/${segment(member.uid)}`,
        { expected_revision: current?.revision ?? 0, active, reason: reason.trim() },
        "PUT", false, session.uid,
      );
      if (saved.uid !== member.uid || saved.event_id !== assignmentsLoadedFor || saved.active !== active || !Number.isSafeInteger(saved.revision) || typeof saved.reason !== "string") throw new Error("The event assignment response could not be verified.");
      setReason("");
      setConfirmAssignment(null);
      await loadAssignments();
      setNotice(active ? "Event assignment saved and audited." : "Event assignment removed and audited.");
    } catch (cause) {
      setError(cause instanceof ApiError && cause.status === 401
        ? "This assignment change requires a fresh sign-in. Sign out, sign in again, then retry."
        : cause instanceof ApiError && cause.status === 409
          ? "The assignment changed. Reload the event assignments before retrying."
          : cause instanceof Error ? cause.message : "Unable to change event assignment.");
    } finally { setAssignmentBusy(false); }
  }

  const isActive = (member: StaffMember) => member.active && (!member.expires_at || member.expires_at > Date.now() / 1000);
  return <main id="main-content" className="workspace-main">
    <PageHeading eyebrow={`Chapter access / ${chapterId.toUpperCase()}`} title="Staff & chapter access" description="Grant time-limited chapter roles to existing WSB accounts and assign active staff to an event." />
    {loading && <p role="status">Loading current chapter access…</p>}
    {!loading && error && !session && <section className="panel"><p role="alert" className="form-error">{error}</p><Link className="button button-outline" href={`/sign-in?next=${encodeURIComponent(`/admin/${chapterId}/staff`)}`}>Sign in</Link></section>}
    {!loading && session && session.chapter_id !== chapterId && <p role="alert" className="form-error">This account is signed in to another chapter.</p>}
    {!loading && session?.chapter_id === chapterId && session.role !== "chapter_director" && <p role="alert" className="form-error">Only a chapter director can manage chapter access.</p>}
    {!loading && session?.chapter_id === chapterId && session.role === "chapter_director" && <>
      <section className="panel connected-stack" aria-labelledby="grant-heading">
        <h2 id="grant-heading">Grant chapter role</h2>
        <p>Use the Firebase account UID of an existing person. Chapter directors cannot grant director authority. Role changes require sign-in within the last five minutes and take effect after the recipient signs in again.</p>
        <form onSubmit={submit} className="connected-stack">
          <label htmlFor="staff-uid">Firebase account UID<input id="staff-uid" value={uid} onChange={event => setUid(event.target.value)} required minLength={1} maxLength={128} autoComplete="off" /></label>
          <label htmlFor="staff-role">Chapter role<select id="staff-role" value={role} onChange={event => setRole(event.target.value)}>{roles.map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label>
          <label htmlFor="staff-expiry">Access expires<input id="staff-expiry" type="datetime-local" value={expiresAt} onChange={event => setExpiresAt(event.target.value)} required /></label>
          <label htmlFor="staff-reason">Reason<input id="staff-reason" value={reason} onChange={event => setReason(event.target.value)} required minLength={8} maxLength={1000} /></label>
          <button className="button button-volt" disabled={busy || !uid.trim() || reason.trim().length < 8} style={{ minHeight: 56 }}>{busy ? "Saving access…" : "Grant chapter role"}</button>
        </form>
      </section>
      {error && <p role="alert" className="form-error">{error}</p>}{notice && <p role="status">{notice}</p>}
      {shareUrl && <section className="panel connected-stack" aria-labelledby="share-invitation-heading">
        <h2 id="share-invitation-heading">Share the invitation link</h2>
        <p>The link is bound to the intended account UID, can be used once, and expires in 7 days. Send it directly to that person.</p>
        <label htmlFor="staff-invitation-link">One-time link<input id="staff-invitation-link" value={shareUrl} readOnly onFocus={event => event.currentTarget.select()} /></label>
        <div className="connected-actions"><button type="button" className="button button-outline" onClick={() => void copyInvitationLink()}>Copy invitation link</button><Link className="button button-outline" href={shareUrl}>Open invitation</Link></div>
      </section>}
      <section className="panel connected-stack" aria-labelledby="invite-heading">
        <h2 id="invite-heading">Invite chapter staff</h2>
        <p>Invite an existing WSB account by Firebase UID. The recipient must sign in as that account to accept. The invitation link is shown once after creation; WSB does not send an email.</p>
        {pendingInvitation && <div className="info-note" role="status"><p>A saved invitation request is waiting to resume for <span className="mono">{pendingInvitation.target_uid}</span> as {pendingInvitation.role.replaceAll("_", " ")}.</p><button type="button" className="button button-outline" disabled={busy} onClick={clearPendingInvitation}>Discard saved request</button></div>}
        <form className="connected-stack" onSubmit={createInvitation}>
          <label>Firebase account UID<input value={pendingInvitation?.target_uid ?? inviteTargetUid} onChange={event => setInviteTargetUid(event.target.value)} required maxLength={128} autoComplete="off" disabled={busy || !!pendingInvitation} /></label>
          <label>Chapter role<select value={pendingInvitation?.role ?? inviteRole} onChange={event => setInviteRole(event.target.value)} disabled={busy || !!pendingInvitation}>{roles.map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label>
          <label>Staff access expires<input type="datetime-local" value={inviteAccessExpiry} onChange={event => setInviteAccessExpiry(event.target.value)} required disabled={busy || !!pendingInvitation} /></label>
          <label>Reason for invitation or revocation<input value={inviteReason} onChange={event => setInviteReason(event.target.value)} required minLength={8} maxLength={1000} disabled={busy} /></label>
          <button className="button button-volt" disabled={busy || inviteReason.trim().length < 8 || (!pendingInvitation && (!inviteTargetUid.trim() || !inviteAccessExpiry))}>{busy ? "Saving…" : pendingInvitation ? "Retry saved invitation" : "Create invitation"}</button>
        </form>
        <div className="connected-stack" aria-labelledby="invitations-list-heading">
          <div className="panel-heading"><div><h3 id="invitations-list-heading">Chapter invitations</h3><p>Pending invitations can be revoked before acceptance.</p></div><button type="button" className="button button-outline" disabled={busy} onClick={() => void load()}>Refresh</button></div>
          {invitations.length === 0 && <p>No staff invitations have been issued for this chapter.</p>}
          <ul className="connected-list">{invitations.map(invitation => {
            const accessExpired = invitation.access_expires_at <= Date.now() / 1000;
            const pending = invitation.active && !invitation.accepted_at && invitation.expires_at > Date.now() / 1000 && !accessExpired;
            const label = invitation.accepted_at ? "Accepted" : !invitation.active ? "Revoked" : invitation.expires_at <= Date.now() / 1000 || accessExpired ? "Expired" : "Pending";
            return <li key={invitation.id} className="connected-stack"><div className="flex flex-wrap items-center justify-between gap-3"><div><strong className="mono">{invitation.target_uid}</strong><p>{invitation.role.replaceAll("_", " ")} · invite expires {new Date(invitation.expires_at * 1000).toLocaleString()} · access through {new Date(invitation.access_expires_at * 1000).toLocaleString()}</p></div><Status tone={pending ? "amber" : "volt"}>{label}</Status></div>{pending && <button type="button" className="button button-outline" disabled={busy || inviteReason.trim().length < 8} onClick={() => void revokeInvitation(invitation)}>Revoke invitation</button>}</li>;
          })}</ul>
          {invitationCursor && <button type="button" className="button button-outline" disabled={busy} onClick={() => void loadMoreInvitations()}>Load more invitations</button>}
        </div>
      </section>
      <section className="panel connected-stack" aria-labelledby="members-heading">
        <div className="panel-heading"><div><h2 id="members-heading">Current chapter staff</h2><p>Only staff roles are listed. Participant memberships remain in participant workspaces.</p></div><button className="button button-outline" disabled={busy || loading} onClick={() => void load()}>Refresh</button></div>
        {members.length === 0 && !loading ? <p>No staff memberships are recorded for this chapter.</p> : <ul className="connected-list">{members.map(member => <li key={member.uid} className="connected-stack">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><strong className="mono">{member.uid}</strong><p>{member.role.replaceAll("_", " ")} · revision {member.revision}{member.expires_at ? ` · expires ${new Date(member.expires_at * 1000).toLocaleString()}` : " · no expiry recorded"}</p></div><Status tone={isActive(member) ? "volt" : "amber"}>{isActive(member) ? "Active" : "Inactive or expired"}</Status></div>
          {member.active && member.role !== "chapter_director" && (confirmRevoke === member.uid ? <div className="connected-actions" role="group" aria-label={`Confirm revocation for ${member.uid}`}><p>Revoke this chapter role now? A reason is required above.</p><button className="button button-outline" disabled={busy || reason.trim().length < 8} onClick={() => void revoke(member)}>Confirm revocation</button><button className="button button-outline" disabled={busy} onClick={() => setConfirmRevoke(null)}>Cancel</button></div> : <button className="button button-outline" disabled={busy} onClick={() => { setConfirmRevoke(member.uid); setError(""); setNotice(""); }} aria-label={`Revoke ${member.role.replaceAll("_", " ")} access for ${member.uid}`}>Revoke chapter access</button>)}
        </li>)}</ul>}
        {cursor && <button className="button button-outline" disabled={busy || loading} onClick={() => void load(cursor)}>Load more staff</button>}
      </section>
      <section className="panel connected-stack" aria-labelledby="assignments-heading">
        <h2 id="assignments-heading">Event assignments</h2>
        <p>Assign active chapter staff to event operations. The event must exist in this chapter. Assignments do not change the member’s chapter role.</p>
        <div className="connected-actions"><label htmlFor="staff-event-id">Event ID<input id="staff-event-id" value={eventId} onChange={event => { setEventId(event.target.value); setAssignments([]); setAssignmentsLoadedFor(""); setAssignmentCursor(null); }} maxLength={128} autoComplete="off" /></label><button className="button button-outline" onClick={() => void loadAssignments()} disabled={assignmentBusy || !eventId.trim()}>Load event assignments</button></div>
        {assignmentsLoadedFor && <p>Loaded event <span className="mono">{assignmentsLoadedFor}</span>. Enter a reason above before changing an assignment.</p>}
        {assignmentsLoadedFor && members.filter(member => roles.includes(member.role) && member.active && (!member.expires_at || member.expires_at > Date.now() / 1000)).map(member => {
          const assignment = assignments.find(row => row.uid === member.uid && row.event_id === assignmentsLoadedFor);
          const requested = confirmAssignment?.uid === member.uid;
          return <div key={`${assignmentsLoadedFor}:${member.uid}`} className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 py-3"><div><strong className="mono">{member.uid}</strong><p>{member.role.replaceAll("_", " ")} · {assignment?.active ? `assigned · revision ${assignment.revision}` : "not assigned"}</p></div>{requested ? <div className="connected-actions" role="group" aria-label={`${confirmAssignment.active ? "Confirm assignment" : "Confirm removal"} for ${member.uid}`}><span>{confirmAssignment.active ? "Assign this person to the event?" : "Remove this event assignment?"}</span><button className="button button-outline" disabled={assignmentBusy || !reason.trim()} onClick={() => void changeAssignment(member)}>{assignmentBusy ? "Saving…" : "Confirm"}</button><button className="button button-outline" disabled={assignmentBusy} onClick={() => setConfirmAssignment(null)}>Cancel</button></div> : <button className="button button-outline" disabled={assignmentBusy || !reason.trim()} onClick={() => setConfirmAssignment({ uid: member.uid, active: !assignment?.active })}>{assignment?.active ? "Remove event assignment" : "Assign to event"}</button>}</div>;
        })}
        {assignmentsLoadedFor && assignmentCursor && <button className="button button-outline" onClick={() => void loadAssignments(assignmentCursor)} disabled={assignmentBusy}>Load more assignments</button>}
      </section>
    </>}
  </main>;
}
