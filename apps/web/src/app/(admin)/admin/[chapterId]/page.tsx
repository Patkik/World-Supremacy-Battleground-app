"use client";

import { use } from "react";
import Link from "next/link";
import { Arrow, PageHeading, Status } from "@/components/ui";
import { useWorkspaceSession } from "@/lib/account";
import { segment } from "@/lib/connected-api";

type Module = { title: string; detail: string; href: string; roles: string[] };

function modulesFor(chapter: string): Module[] {
  return [
    { title: "Event management", detail: "Create and edit event drafts, registration windows and open each event command center.", href: `/admin/${chapter}/events`, roles: ["chapter_director"] },
    { title: "Staff & assignments", detail: "Manage chapter roles, invitations and event assignments.", href: `/admin/${chapter}/staff`, roles: ["chapter_director"] },
    { title: "Finance transactions", detail: "Review the recorded payment ledger and reconcile manual references.", href: `/admin/${chapter}/finance/transactions`, roles: ["chapter_director", "finance"] },
    { title: "Chapter audit history", detail: "Read-only persisted audit records for this chapter.", href: `/admin/${chapter}/audit`, roles: ["chapter_director", "auditor"] },
    { title: "Chapter content drafts", detail: "Private plain-text drafts with revision history. Nothing is published from this workspace.", href: `/admin/${chapter}/content`, roles: ["chapter_director"] },
    { title: "Support queue", detail: "Read and reply to chapter member and public inquiries.", href: `/admin/${chapter}/support`, roles: ["chapter_director", "support"] },
    { title: "Identity review", detail: "Review pending, clean-scanned private verification cases.", href: `/admin/${chapter}/verification`, roles: ["chapter_director", "verifier"] },
  ];
}

export default function ChapterDashboardPage({
  params,
}: {
  params: Promise<{ chapterId: string }>;
}) {
  const { chapterId } = use(params);
  const { session, loading, error } = useWorkspaceSession(chapterId);
  const chapter = segment(chapterId);
  const sameChapter = !!session && session.chapter_id === chapterId;
  const available = sameChapter ? modulesFor(chapter).filter(module => module.roles.includes(session.role)) : [];

  return <main id="main-content" className="workspace-main">
    <PageHeading
      eyebrow={`Chapter Command / ${chapterId.toUpperCase()}`}
      title="Chapter operations"
      description="Open the connected workspace for your chapter role. Each workspace checks your current membership and assignment on the server."
    />
    {loading ? <p role="status">Checking chapter access…</p>
      : !session ? <p role="alert" className="form-error">{error || "Sign in with your chapter account to continue."}</p>
        : !sameChapter ? <p role="alert" className="form-error">This account is not signed into the chapter that owns this workspace. Choose the chapter from your workspaces first.</p>
          : <>
            <section className="panel" aria-label="Current access">
              <div className="panel-heading"><div><h2>Your chapter access</h2><p>Resolved from current server-side membership, not from a saved browser selection.</p></div><Status tone="volt">{session.role.replaceAll("_", " ")}</Status></div>
            </section>
            {available.length > 0 && <section className="connected-stack" aria-label="Available modules">
              {available.map(module => <article className="panel" key={module.href}>
                <div className="panel-heading"><div><h2>{module.title}</h2><p>{module.detail}</p></div></div>
                <Link href={module.href} className="button button-outline">Open {module.title.toLowerCase()} <Arrow /></Link>
              </article>)}
            </section>}
            {(session.role === "registrar" || session.role === "marshal" || session.role === "judge" || session.role === "head_judge" || session.role === "audio_operator") && <section className="panel">
              <div className="panel-heading"><div><h2>Event-duty access</h2><p>Choose an assigned event to open registration review, stage, judging or audio operations.</p></div></div>
              <Link href="/console" className="button button-outline">Open assigned events <Arrow /></Link>
            </section>}
            {available.length === 0 && !["registrar", "marshal", "judge", "head_judge", "audio_operator"].includes(session.role) && <section className="panel"><p>No chapter operations modules are connected for your current role.</p></section>}
          </>}
  </main>;
}
