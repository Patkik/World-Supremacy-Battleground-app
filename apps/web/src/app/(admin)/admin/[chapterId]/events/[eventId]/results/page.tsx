import { ConnectedResultsPublication } from "@/components/connected-results-publication";

export default async function AdminEventResultsPublicationPage({
  params,
}: {
  params: Promise<{ chapterId: string; eventId: string }>;
}) {
  const { chapterId, eventId } = await params;
  return <ConnectedResultsPublication chapterId={chapterId} eventId={eventId} />;
}
