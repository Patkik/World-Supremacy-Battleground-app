import { ScoreOutbox } from "@/components/score-outbox";
export default async function Page({ params }: { params: Promise<{ eventId: string }> }) {
  return <ScoreOutbox eventId={(await params).eventId} />;
}
