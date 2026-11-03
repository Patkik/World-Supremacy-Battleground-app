import { EventCommandCenter } from "@/components/event-command-center";

export default async function Page({ params }: { params: Promise<{ chapterId: string; eventId: string }> }) {
  const { chapterId, eventId } = await params;
  return <EventCommandCenter chapterId={chapterId} eventId={eventId} />;
}
