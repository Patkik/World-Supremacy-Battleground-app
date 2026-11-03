import { PublicStageDisplay } from "@/components/public-stage-display";

export default async function ArenaLiveDisplayPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  return <PublicStageDisplay eventId={eventId} />;
}
