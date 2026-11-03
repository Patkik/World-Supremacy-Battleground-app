"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { PageHeading, Status } from "@/components/ui";
import { ApiError, connectedPage, segment } from "@/lib/connected-api";
import { globalHqSession } from "@/lib/api";
import { registrationCommand } from "@/lib/registration-command";

type HqSession = { uid: string; role: string };
type StaffMember = { uid: string; chapter_id: string; role: string; active: boolean; valid_after: number; revision: number; expires_at: number | null };
const roles = ["chapter_director", "registrar", "finance", "verifier", "support", "head_judge", "judge", "marshal", "audio_operator", "auditor"];

function validMembership(value: unknown, chapter: string): value is StaffMember {
  if (!value || typeof value !== "object") return false;
  const member = value as Partial<StaffMember>;
  return member.chapter_id === chapter && typeof member.uid === "string" && member.uid.length > 0
    && roles.includes(member.role ?? "") && typeof member.active === "boolean"
    && Number.isSafeInteger(member.revision) && (member.revision ?? -1) >= 0
    && Number.isFinite(member.valid_after) && (member.expires_at === null || Number.isFinite(member.expires_at));
}

export function HqAccessWorkspace() {
  const [session, setSession] = useState<HqSession | null>(null);
  const [chapter, setChapter] = useState("");
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [uid, setUid] = useState("");
  const [role, setRole] = useState(roles[0]);
  const [expiresAt, setExpiresAt] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const loadGeneration = useRef(0);
  const activeChapter = useRef("");
  activeChapter.current = chapter.trim();

  useEffect(() => {
    let current = true;
    globalHqSession().then(value => { if (current) setSession(value); })
      .catch(cause => { if (current) setError(cause instanceof Error ? cause.message : "Global access could not be verified."); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, []);

  const load = useCallback(async (next?: string | null) => {
    if (!session || !chapter.trim()) return;
    const generation = ++loadGeneration.current;
    const requestedChapter = chapter.trim();
    setLoading(true); setError(""); setNotice("");
    try {
      const page = await connectedPage<StaffMember>(`/v1/hq/chapters/${segment(requestedChapter)}/members`, next, session.uid);
      if (!Array.isArray(page.items) || page.items.some(member => !validMembership(member, requestedChapter)) || (page.next_page !== null && typeof page.next_page !== "string")) throw new Error("Chapter access records could not be verified.");
      if (generation === loadGeneration.current && activeChapter.current === requestedChapter) {
        setMembers(previous => next ? [...previous, ...page.items] : page.items);
        setCursor(page.next_page);
      }
    } catch (cause) {
      if (generation === loadGeneration.current && activeChapter.current === requestedChapter) {
        if (!next) setMembers([]);
        setCursor(null);
        setError(cause instanceof Error ? cause.message : "Unable to load chapter staff.");
      }
    } finally { if (generation === loadGeneration.current && activeChapter.current === requestedChapter) setLoading(false); }
  }, [chapter, session]);

  async function grant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !chapter.trim()) return;
    const target = uid.trim();
    const operationGeneration = loadGeneration.current;
    const requestedChapter = chapter.trim();
    const expiry = Math.floor(new Date(expiresAt).getTime() / 1000);
    if (!Number.isFinite(expiry) || expiry <= Date.now() / 1000) { setError("Choose a future expiry for this access."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const current = members.find(member => member.uid === target);
      const saved = await registrationCommand<StaffMember>(
        `/v1/hq/chapters/${segment(requestedChapter)}/members/${segment(target)}`,
        { expected_revision: current?.revision ?? 0, role, active: true, expires_at: expiry, reason: reason.trim() },
        "PUT", false, session.uid,
      );
      if (operationGeneration !== loadGeneration.current || activeChapter.current !== requestedChapter) return;
      if (!validMembership(saved, requestedChapter) || saved.uid !== target || saved.role !== role || !saved.active) throw new Error("The access grant response could not be verified.");
      setUid(""); setExpiresAt(""); setReason(""); setConfirmRevoke(null);
      setBusy(false);
      await load();
      setNotice("Chapter access saved and audited. The recipient must sign in again before using the new role.");
    } catch (cause) {
      if (operationGeneration === loadGeneration.current && activeChapter.current === requestedChapter) setError(cause instanceof ApiError && cause.status === 401
        ? "Changing access requires a fresh sign-in. Sign out, sign in again, then retry."
        : cause instanceof ApiError && cause.status === 422
          ? "The Firebase Auth account could not be found or is disabled. Check the UID and account status."
        : cause instanceof ApiError && cause.status === 409
          ? "The membership changed. Reload the current chapter staff before retrying."
          : cause instanceof Error ? cause.message : "Unable to save chapter access.");
    } finally { if (operationGeneration === loadGeneration.current && activeChapter.current === requestedChapter) setBusy(false); }
  }

  async function revoke(member: StaffMember) {
    if (!session || !reason.trim()) { setError("Enter a reason before revoking access."); return; }
    const operationGeneration = loadGeneration.current;
    const requestedChapter = chapter.trim();
    setBusy(true); setError(""); setNotice("");
    try {
      const saved = await registrationCommand<StaffMember>(
        `/v1/hq/chapters/${segment(requestedChapter)}/members/${segment(member.uid)}`,
        { expected_revision: member.revision, role: member.role, active: false, expires_at: member.expires_at, reason: reason.trim() },
        "PUT", false, session.uid,
      );
      if (operationGeneration !== loadGeneration.current || activeChapter.current !== requestedChapter) return;
      if (!validMembership(saved, requestedChapter) || saved.uid !== member.uid || saved.role !== member.role || saved.active) throw new Error("The access revocation response could not be verified.");
      setReason(""); setConfirmRevoke(null); setBusy(false); await load();
      setNotice("Chapter access revoked and recorded in the chapter audit log.");
    } catch (cause) {
      if (operationGeneration === loadGeneration.current && activeChapter.current === requestedChapter) setError(cause instanceof ApiError && cause.status === 401
        ? "Changing access requires a fresh sign-in. Sign out, sign in again, then retry."
        : cause instanceof ApiError && cause.status === 409
          ? "The membership changed. Reload the current chapter staff before retrying."
          : cause instanceof Error ? cause.message : "Unable to revoke chapter access.");
    } finally { if (operationGeneration === loadGeneration.current && activeChapter.current === requestedChapter) setBusy(false); }
  }

  return <main id="main-content" className="workspace-main">
    <PageHeading eyebrow="Global HQ / Access" title="Chapter access governance" description="Manage chapter roles through a signed, audited HQ command." action={<Link href="/hq" className="button button-outline">HQ overview</Link>} />
    {!session && loading && <p role="status">Verifying Global HQ access…</p>}
    {!session && error && <p role="alert" className="form-error">{error}</p>}
    {session && <>
      <section className="panel connected-stack">
        <h2>Choose chapter</h2>
        <p>Enter a chapter reference to inspect staff access. HQ membership itself can only be provisioned through a trusted administrative process.</p>
        <div className="connected-actions"><label htmlFor="hq-chapter">Chapter ID<input id="hq-chapter" value={chapter} maxLength={128} autoComplete="off" onChange={event => { loadGeneration.current++; activeChapter.current = event.target.value.trim(); setChapter(event.target.value); setMembers([]); setCursor(null); setConfirmRevoke(null); setLoading(false); setBusy(false); setError(""); setNotice(""); }} /></label><button className="button button-outline" disabled={loading || !chapter.trim()} onClick={() => void load()}>Load chapter staff</button></div>
      </section>
      {chapter.trim() && <section className="panel connected-stack">
        <h2>Grant or change chapter role</h2>
        <p>Chapter directors can appoint event staff within their chapter. HQ can also appoint a chapter director. Use an existing Firebase account UID; this workspace does not create accounts or verify UIDs against Firebase Auth.</p>
        <form onSubmit={grant} className="connected-stack">
          <label htmlFor="hq-staff-uid">Firebase account UID<input id="hq-staff-uid" required maxLength={128} autoComplete="off" value={uid} onChange={event => setUid(event.target.value)} /></label>
          {uid.trim() === session.uid && <p role="alert" className="form-error">HQ access cannot be changed through this chapter form for the signed-in account.</p>}
          <label htmlFor="hq-staff-role">Chapter role<select id="hq-staff-role" value={role} onChange={event => setRole(event.target.value)}>{roles.map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label>
          <label htmlFor="hq-staff-expiry">Access expires<input id="hq-staff-expiry" required type="datetime-local" value={expiresAt} onChange={event => setExpiresAt(event.target.value)} /></label>
          <label htmlFor="hq-staff-reason">Reason<input id="hq-staff-reason" required minLength={8} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} /></label>
          <button className="button button-volt" disabled={busy || !session || !uid.trim() || uid.trim() === session.uid || reason.trim().length < 8}>{busy ? "Saving access…" : "Grant chapter role"}</button>
        </form>
      </section>}
      {error && <p role="alert" className="form-error">{error}</p>}{notice && <p role="status">{notice}</p>}
      {chapter.trim() && <section className="panel connected-stack">
        <div className="panel-heading"><div><h2>Chapter staff</h2><p>{chapter.trim()} · current server memberships</p></div><button className="button button-outline" disabled={busy || loading} onClick={() => void load()}>Refresh</button></div>
        {loading && <p role="status">Loading current staff…</p>}
        {!loading && members.length === 0 && !error && <p>No staff memberships are recorded for this chapter.</p>}
        <ul className="connected-list">{members.map(member => {
          const active = member.active && (!member.expires_at || member.expires_at > Date.now() / 1000);
          return <li key={member.uid} className="connected-stack"><div className="flex flex-wrap items-center justify-between gap-3"><div><strong className="mono">{member.uid}</strong><p>{member.role.replaceAll("_", " ")} · revision {member.revision}{member.expires_at ? ` · expires ${new Date(member.expires_at * 1000).toLocaleString()}` : " · no expiry recorded"}</p></div><Status tone={active ? "volt" : "amber"}>{active ? "Active" : "Inactive or expired"}</Status></div>
            {active && member.uid !== session.uid && (confirmRevoke === member.uid ? <div className="connected-actions" role="group" aria-label={`Confirm revocation for ${member.uid}`}><span>Revoke this chapter role? A reason is required above.</span><button className="button button-outline" disabled={busy || reason.trim().length < 8} onClick={() => void revoke(member)}>Confirm revocation</button><button className="button button-outline" disabled={busy} onClick={() => setConfirmRevoke(null)}>Cancel</button></div> : <button className="button button-outline" disabled={busy} onClick={() => { setConfirmRevoke(member.uid); setError(""); setNotice(""); }}>Revoke chapter access</button>)}
          </li>;
        })}</ul>
        {cursor && <button className="button button-outline" disabled={busy || loading} onClick={() => void load(cursor)}>Load more staff</button>}
      </section>}
      <p className="fineprint">Changes require a recent sign-in, reason, expiry and current revision. They write an audit record and replay receipt with the membership. Event assignments remain in the chapter workspace. UID existence, email invitations, Global HQ provisioning and production Firebase revocation checks are not provided here.</p>
    </>}
  </main>;
}
