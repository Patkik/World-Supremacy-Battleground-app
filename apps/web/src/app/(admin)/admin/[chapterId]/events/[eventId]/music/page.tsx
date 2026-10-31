import { WorkflowUnavailable } from "@/components/workflow-unavailable";

export default async function Page({ params }: { params: Promise<{ chapterId: string; eventId: string }> }) {
  const { chapterId, eventId } = await params;
  return <WorkflowUnavailable title="Event music" description="Review performance tracks and prepare the event playlist." detail="The music review queue and playlist export are not available yet. This page cannot display or approve tracks." helpHref={`/admin/${encodeURIComponent(chapterId)}/support`} backHref={`/admin/${encodeURIComponent(chapterId)}/events/${encodeURIComponent(eventId)}`} />;
}
