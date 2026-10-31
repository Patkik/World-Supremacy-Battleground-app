import { ConnectedScorecard } from "@/components/connected-scorecard";
export default async function Page({ params }: { params: Promise<{ eventId: string; entryId: string }> }) {
  const { eventId, entryId } = await params;
  return <ConnectedScorecard eventId={eventId} entryId={entryId} />;
}
