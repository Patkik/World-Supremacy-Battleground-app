import { StageWorkspace } from "@/components/stage-workspace";

export default async function BackstageMarshalPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  return <StageWorkspace eventId={eventId} />;
}
