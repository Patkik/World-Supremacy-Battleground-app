import { BattleDraftWorkspace } from "@/components/battle-draft-workspace";
export default async function Page({ params }: { params: Promise<{ chapterId: string; eventId: string }> }) {
  const { chapterId, eventId } = await params;
  return <BattleDraftWorkspace chapter={chapterId} event={eventId} />;
}
