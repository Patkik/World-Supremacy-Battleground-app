"use client";
import Link from "next/link";
import { use } from "react";
import { Arrow, Brand, PageHeading } from "@/components/ui";
import { useWorkspaceSession } from "@/lib/account";
import { segment } from "@/lib/connected-api";
import { HeadJudgeDivisionReview } from "@/components/head-judge-division-review";

export default function DivisionReviewPage({
  params,
}: {
  params: Promise<{ eventId: string; divisionId: string }>;
}) {
  const { eventId, divisionId } = use(params);
  const { session, loading, error } = useWorkspaceSession();
  return <div className="judge-shell"><header className="judge-header"><Brand /><div className="judge-event"><strong>Head judge desk</strong><span>Event {eventId} · {divisionId}</span></div><Link href={`/console/${segment(eventId)}/head-judge`} className="text-link">All divisions <Arrow diagonal /></Link></header><main id="main-content" className="workspace-main"><PageHeading title="Division review and lock" description="Verify panel completeness, record technical deductions, and lock the division. Locking freezes scorecards, readiness and deductions; it does not publish results." />{loading ? <p role="status">Checking access…</p> : !session ? <p role="alert">{error || "Sign in to continue."} <Link href={`/sign-in?next=${segment(`/console/${segment(eventId)}/head-judge/${segment(divisionId)}`)}`}>Sign in</Link></p> : !["head_judge", "chapter_director"].includes(session.role) ? <p role="alert">Your account does not have head-judge access for this event.</p> : <HeadJudgeDivisionReview key={JSON.stringify([session.chapter_id, session.uid, session.role, eventId, divisionId])} chapter={session.chapter_id} event={eventId} division={divisionId} uid={session.uid} director={session.role === "chapter_director"} />}</main></div>;
}
