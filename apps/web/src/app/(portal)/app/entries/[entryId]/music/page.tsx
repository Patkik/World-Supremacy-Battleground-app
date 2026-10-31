import { WorkflowUnavailable } from "@/components/workflow-unavailable";

export default async function Page({ params, searchParams }: { params: Promise<{ entryId: string }>; searchParams: Promise<{ event?: string }> }) {
  const [{ entryId }, query] = await Promise.all([params, searchParams]);
  const back = `/app/entries/${encodeURIComponent(entryId)}${query.event ? `?event=${encodeURIComponent(query.event)}` : ""}`;
  return <WorkflowUnavailable title="Performance music" description="Manage the track for this entry." detail="Music upload and compliance checks are not available yet. No track can be submitted or approved on this page." helpHref="/app/support" backHref={back} />;
}
