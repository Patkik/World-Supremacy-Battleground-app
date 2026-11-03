import { GuardianRequests } from "@/components/guardian-requests";

export default async function Page({ searchParams }: { searchParams: Promise<{ chapter?: string | string[]; request?: string | string[] }> }) {
  const query = await searchParams;
  return <GuardianRequests linkChapter={typeof query.chapter === "string" ? query.chapter : undefined} linkRequest={typeof query.request === "string" ? query.request : undefined} />;
}
