import { EventLineupWorkspace } from "@/components/event-lineup-workspace";

export default async function AdminEventLineupPage({
  params,
}: {
  params: Promise<{ chapterId: string; eventId: string }>;
}) {
  const { chapterId, eventId } = await params;
  return <EventLineupWorkspace chapterId={chapterId} eventId={eventId} />;
}
