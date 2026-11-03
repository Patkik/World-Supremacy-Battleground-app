"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useWorkspaceSession } from "@/lib/account";
import { ApiError, connectedRequest, segment } from "@/lib/connected-api";
import type { Crew } from "@/lib/api";
import { Brand } from "./ui";

export function AcceptCrewInvite({ token, chapter, crewId, returnPath, onComplete }: { token: string; chapter: string | null; crewId: string | null; returnPath: string; onComplete: () => void }) {
  const { session, loading, error: sessionError } = useWorkspaceSession(chapter || undefined);
  return <AcceptCrewInviteForm key={`${session?.uid ?? "unverified"}:${chapter ?? ""}:${crewId ?? ""}:${token}`} token={token} chapter={chapter} crewId={crewId} returnPath={returnPath} onComplete={onComplete} session={session} loading={loading} sessionError={sessionError}/>;
}

function AcceptCrewInviteForm({ token, chapter, crewId, returnPath, onComplete, session, loading, sessionError }: { token: string; chapter: string | null; crewId: string | null; returnPath: string; onComplete: () => void; session: { uid: string; chapter_id: string; role: string } | null; loading: boolean; sessionError: string }) {
  const [name, setName] = useState(""); const [minor, setMinor] = useState(false);
  const [crew, setCrew] = useState<Crew | null>(null); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{ dancer_name: string; is_minor: boolean } | null>(null);
  async function accept(event: FormEvent) {
    event.preventDefault(); if (!chapter || !crewId || !session) return;
    const attempt = pending ?? { dancer_name: name.trim(), is_minor: minor };
    setPending(attempt); setBusy(true); setError("");
    try {
      const saved = await connectedRequest<Crew>(`/v1/chapters/${segment(chapter)}/crews/${segment(crewId)}/join`, { token, ...attempt }, "POST", session?.uid);
      if (saved.id !== crewId || saved.chapter_id !== chapter || !Array.isArray(saved.members) || !saved.members.some(member => member.uid === session?.uid && member.role === "Dancer")) throw new Error("The invitation response could not be verified for this account and crew.");
      setCrew(saved); setPending(null); onComplete();
    }
    catch (reason) {
      if (reason instanceof ApiError && [400, 401, 403, 404, 409, 422].includes(reason.status)) {
        setPending(null);
        setError(reason.status === 409 || reason.status === 404 || reason.status === 403 ? "This invitation is unavailable or has changed. Ask your crew manager for help or a new link." : reason.message);
      } else {
        setError("The result could not be confirmed. Retry with the same details to recover a completed join.");
      }
    }
    finally { setBusy(false); }
  }
  async function recover() {
    if (!chapter || !crewId || !session || busy) return;
    setBusy(true); setError("");
    try {
      const saved = await connectedRequest<Crew>(`/v1/chapters/${segment(chapter)}/crews/${segment(crewId)}/join/recover`, { token }, "POST", session.uid);
      if (saved.id !== crewId || saved.chapter_id !== chapter || !Array.isArray(saved.members) || !saved.members.some(member => member.uid === session.uid && member.role === "Dancer")) throw new Error("The invitation receipt could not be verified.");
      setCrew(saved); setPending(null); onComplete();
    } catch (reason) {
      setError(reason instanceof ApiError && [403, 404, 409].includes(reason.status) ? "No recoverable acceptance is available for this account. Check your details or ask your crew manager for help." : reason instanceof Error ? reason.message : "Unable to check the invitation receipt.");
    } finally { setBusy(false); }
  }
  return <main id="main-content" className="system-page"><Brand /><div className="account-form"><h1>{crew ? "Crew joined" : "Join your crew"}</h1>
    {loading ? <p role="status">Checking chapter access…</p> : !session ? <><p>{sessionError || "Sign in to accept your invitation."}</p><Link className="button button-volt" href={`/sign-in?next=${segment(returnPath)}`}>Sign in</Link></> : !chapter || !crewId ? <p className="form-error">This invitation is missing its crew or chapter. Ask your manager for a new link.</p> : session.chapter_id !== chapter ? <p className="form-error">Your chapter membership does not match this invitation.</p> : crew ? <><p>You joined {crew.name}. Identity and guardian consent checks remain separate registration requirements.</p><Link className="button button-volt" href={`/app/crews/${segment(crew.id)}`}>Open crew</Link></> : <form onSubmit={accept}><label htmlFor="invite-name">Your name<input id="invite-name" required maxLength={100} value={name} disabled={busy || !!pending} onChange={e => setName(e.target.value)} /></label><label className="trust-device"><input type="checkbox" checked={minor} disabled={busy || !!pending} onChange={e => setMinor(e.target.checked)} />I am under 18 and need guardian consent.</label><p className="fineprint">Your age and identity will still need verification.</p><button className="button button-volt" disabled={busy}>{busy ? "Joining…" : pending ? "Retry invitation" : "Accept invitation"}</button><button type="button" className="button button-outline" disabled={busy} onClick={() => void recover()}>Recover a previous acceptance</button></form>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </div></main>;
}
