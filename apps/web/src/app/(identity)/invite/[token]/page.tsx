import { CrewInviteLanding } from "@/components/crew-invite-landing";
export default async function Page({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ chapter?: string; crew?: string }> }) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  return <CrewInviteLanding legacyToken={token} chapter={query.chapter || null} crew={query.crew || null} />;
}
