import { PublicStageDisplay } from "@/components/public-stage-display";

export default async function ArenaHoldingPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  return <PublicStageDisplay eventId={eventId} holding />;
}
