import { CrewInviteLanding } from "@/components/crew-invite-landing";
export default async function Page({ searchParams }: { searchParams: Promise<{ chapter?: string; crew?: string }> }) {
  const query = await searchParams;
  return <CrewInviteLanding chapter={query.chapter || null} crew={query.crew || null} />;
}
