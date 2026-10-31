"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useWorkspaceSession } from "@/lib/account";
import { connectedRequest, segment } from "@/lib/connected-api";
import type { Crew } from "@/lib/api";
import { Brand } from "./ui";

export function AcceptCrewInvite({ token, chapter, crewId }: { token: string; chapter: string | null; crewId: string | null }) {
  const { session, loading, error: sessionError } = useWorkspaceSession();
  const [name, setName] = useState(""); const [minor, setMinor] = useState(false);
  const [crew, setCrew] = useState<Crew | null>(null); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const returnPath=`/invite/${segment(token)}?chapter=${segment(chapter||"")}&crew=${segment(crewId||"")}`;
  async function accept(event: FormEvent) {
    event.preventDefault(); if (!chapter || !crewId) return;
    setBusy(true); setError("");
    try { setCrew(await connectedRequest<Crew>(`/v1/chapters/${segment(chapter)}/crews/${segment(crewId)}/join`, { token, dancer_name: name.trim(), is_minor: minor })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to accept this invitation."); }
    finally { setBusy(false); }
  }
  return <main id="main-content" className="system-page"><Brand /><div className="account-form"><h1>{crew ? "Crew joined" : "Join your crew"}</h1>
    {loading ? <p role="status">Checking chapter access…</p> : !session ? <><p>{sessionError || "Sign in to accept your invitation."}</p><Link className="button button-volt" href={`/sign-in?next=${segment(returnPath)}`}>Sign in</Link></> : !chapter || !crewId ? <p className="form-error">This invitation is missing its crew or chapter. Ask your manager for a new link.</p> : session.chapter_id !== chapter ? <p className="form-error">Your chapter membership does not match this invitation.</p> : crew ? <><p>You joined {crew.name}. Identity and guardian consent checks remain separate registration requirements.</p><Link className="button button-volt" href={`/app/crews/${segment(crew.id)}`}>Open crew</Link></> : <form onSubmit={accept}><label htmlFor="invite-name">Your name<input id="invite-name" required maxLength={100} value={name} onChange={e => setName(e.target.value)} /></label><label className="trust-device"><input type="checkbox" checked={minor} onChange={e => setMinor(e.target.checked)} />I am under 18 and need guardian consent.</label><p className="fineprint">Your age and identity will still need verification.</p><button className="button button-volt" disabled={busy}>{busy ? "Joining…" : "Accept invitation"}</button></form>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </div></main>;
}
