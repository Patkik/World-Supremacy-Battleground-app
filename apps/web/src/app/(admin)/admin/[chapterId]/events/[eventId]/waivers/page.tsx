import { WaiverDraft } from "@/components/waiver-draft";
export default async function Page({ params }: { params: Promise<{ chapterId: string; eventId: string }> }) {
  const { chapterId, eventId } = await params;
  return <WaiverDraft chapter={chapterId} event={eventId} />;
}
