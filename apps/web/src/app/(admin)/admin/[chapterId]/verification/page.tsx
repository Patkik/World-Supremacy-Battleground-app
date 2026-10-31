import { VerificationWorkspace } from "@/components/verification-workspace";

export default async function Page({ params }: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = await params;
  return <VerificationWorkspace mode="review" chapterId={chapterId} />;
}
