import { MusicReviewQueue } from "@/components/music-review-queue";

export default async function Page({ params }: { params: Promise<{ chapterId: string; eventId: string }> }) {
  const { chapterId, eventId } = await params;
  return <MusicReviewQueue chapterId={chapterId} eventId={eventId} />;
}
