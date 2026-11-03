import { EventDayEntries } from "@/components/event-day-entries";

export default async function EventDayPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  return <EventDayEntries eventId={eventId} />;
}
