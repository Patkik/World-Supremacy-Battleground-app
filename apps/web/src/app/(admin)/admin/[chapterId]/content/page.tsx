import { ChapterContentDrafts } from "@/components/chapter-content-drafts";

export default function ChapterContentManagementPage({
  params,
}: {
  params: Promise<{ chapterId: string }>;
}) {
  return <ChapterContentDrafts params={params} />;
}
