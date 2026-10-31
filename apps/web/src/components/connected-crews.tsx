"use client";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useWorkspaceSession } from "@/lib/account";
import { connectedPage, connectedRequest, segment } from "@/lib/connected-api";
import type { Crew, CrewInvitation } from "@/lib/api";
import { PageHeading } from "./ui";
import { registrationCommand } from "@/lib/registration-command";

function AccessMessage({ loading, error }: { loading: boolean; error: string }) {
  return loading ? <p role="status">Checking chapter access…</p> : error ? <p className="form-error" role="alert">{error}</p> : <Link className="button button-volt" href="/sign-in">Sign in to continue</Link>;
}

export function ConnectedCrews({ crewId, create = false }: { crewId?: string; create?: boolean }) {
  const { session, loading, error: sessionError } = useWorkspaceSession();
  const [crews, setCrews] = useState<Crew[]>([]);
  const [crew, setCrew] = useState<Crew | null>(null);
  const [name, setName] = useState(""); const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [invitation, setInvitation] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const router = useRouter();
  const load = useCallback(async (next?: string | null) => {
    if (!session || create) return;
    setBusy(true); setError("");
    try {
      const path = `/v1/chapters/${segment(session.chapter_id)}/crews`;
      if (crewId) setCrew(await connectedRequest<Crew>(`${path}/${segment(crewId)}`));
      else { const page = await connectedPage<Crew>(path, next); setCrews(previous => next ? [...previous, ...page.items] : page.items); setCursor(page.next_page); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load crews."); }
    finally { setBusy(false); }
  }, [session, create, crewId]);
  useEffect(() => { void load(); }, [load]);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!session) return;
    setBusy(true); setError("");
    try {
      const result = await registrationCommand<Crew>(`/v1/chapters/${segment(session.chapter_id)}/crews`, { name, city });
      router.push(`/app/crews/${segment(result.id)}`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to create crew."); }
    finally { setBusy(false); }
  }
  async function invite() {
    if (!session || !crew) return;
    setBusy(true); setError("");
    try {
      const result = await registrationCommand<CrewInvitation>(`/v1/chapters/${segment(session.chapter_id)}/crews/${segment(crew.id)}/invitations`);
      setInvitation(`${location.origin}/invite/${segment(result.token)}?chapter=${segment(session.chapter_id)}&crew=${segment(crew.id)}`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to create invitation."); }
    finally { setBusy(false); }
  }
  return <main id="main-content" className="workspace-main"><PageHeading title={create ? "Create your crew" : crewId ? crew?.name || "Crew details" : "Your crews"} description="Chapter access and crew membership are verified by the server." /><div className="connected-stack">
    {!session ? <AccessMessage loading={loading} error={sessionError} /> : <>
      {create ? <form className="panel" onSubmit={submit}><p>Chapter: <strong>{session.chapter_id.toUpperCase()}</strong></p><label htmlFor="crew-name">Crew name<input id="crew-name" required maxLength={120} value={name} onChange={e => setName(e.target.value)} /></label><label htmlFor="crew-city">Home city<input id="crew-city" maxLength={120} value={city} onChange={e => setCity(e.target.value)} /></label><button className="button button-volt" disabled={busy || session.role !== "crew_manager"}>{busy ? "Creating…" : "Create crew"}</button>{session.role !== "crew_manager" && <p>Your chapter organizer must assign the crew manager role before you create a crew.</p>}</form> : crewId ? crew && <section className="panel"><p>{crew.city} · {crew.chapter_id.toUpperCase()}</p><h2>Roster</h2><ul>{crew.members.map(member => <li key={member.uid}>{member.name} · {member.role}{member.is_minor ? member.consent_verified ? " · Guardian consent verified" : " · Guardian consent pending" : ""}</li>)}</ul>{crew.manager_uid === session.uid && <button className="button button-volt" disabled={busy} onClick={invite}>Create dancer invitation</button>}{invitation && <div><label htmlFor="crew-invite">One-use invitation link<input id="crew-invite" value={invitation} readOnly onFocus={e => e.target.select()} /></label><p className="field-help">Expires in seven days. Share with the intended dancer.</p></div>}</section> : <>
        {session.role === "crew_manager" && <Link className="button button-volt" href="/app/crews/new">Create crew</Link>}
        {busy ? <p role="status">Loading crews…</p> : crews.length === 0 && !error ? <p>No crew memberships yet. Create your crew or open a dancer invitation.</p> : crews.map(item => <section className="panel" key={item.id}><h2>{item.name}</h2><p>{item.city} · {item.members.length} members</p><Link className="text-link" href={`/app/crews/${segment(item.id)}`}>Open crew</Link></section>)}
      </>}
      {!crewId && cursor && <button className="button button-outline" disabled={busy} onClick={() => void load(cursor)}>Load more crews</button>}
      {error && <p className="form-error" role="alert">{error}</p>}{!create && <button className="button button-outline" disabled={busy} onClick={() => void load()}>Refresh</button>}
    </>}
  </div></main>;
}
