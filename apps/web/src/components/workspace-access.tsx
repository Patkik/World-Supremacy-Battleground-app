"use client";
import Link from "next/link";
import { signOut } from "firebase/auth";
import { useWorkspaceSession } from "@/lib/account";
import { firebaseClient } from "@/lib/firebase/client";
import { Brand } from "./ui";

export function WorkspaceAccess() {
  const { user, session, loading, error } = useWorkspaceSession();
  const path = !session ? "" : session.role === "support" ? `/admin/${encodeURIComponent(session.chapter_id)}/support` : ["judge", "head_judge", "marshal"].includes(session.role) ? "/console" : ["chapter_director", "registrar", "finance", "verifier"].includes(session.role) ? `/admin/${encodeURIComponent(session.chapter_id)}` : "/app/crews";
  return <main id="main-content" className="system-page"><Brand /><div className="account-form"><h1>Your workspace</h1>
    {loading ? <p role="status">Checking your membership…</p> : !user ? <Link className="button button-volt" href="/sign-in">Sign in to continue</Link> : error ? <p className="form-error" role="alert">{error}</p> : session ? <><p>Chapter: <strong>{session.chapter_id.toUpperCase()}</strong></p><p>Assigned role: {session.role.replaceAll("_", " ")}</p><Link className="button button-volt" href={path}>Open workspace</Link></> : null}
    {user && <button className="button button-outline" onClick={() => signOut(firebaseClient().auth)}>Sign out</button>}
    {process.env.NEXT_PUBLIC_WSB_LOCAL_TESTING === "true" && session?.chapter_id === "ph" && <section className="connected-stack"><h2>Local rehearsal</h2><p className="fineprint">Use synthetic data in this test environment.</p>{session.role === "crew_manager" && <><Link href="/app/crews">Your crews</Link><Link href="/app/register/local-rehearsal">Register a crew</Link><Link href="/app/entries/local-entry-draft/checkout?event=local-rehearsal">Test payment reference</Link></>}{["judge", "head_judge"].includes(session.role) && <Link href="/console/local-rehearsal/judge">Assigned performances</Link>}{["registrar","chapter_director"].includes(session.role)&&<Link href="/admin/ph/events/local-rehearsal/registrations">Event registrations</Link>}{["finance", "chapter_director"].includes(session.role) && <Link href="/admin/ph/finance/transactions">Payment reconciliation</Link>}</section>}
  </div></main>;
}
