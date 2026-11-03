import { ConnectedEntry } from "@/components/connected-entry";

export default async function Page({ params, searchParams }: {
  params: Promise<{ entryId: string }>;
  searchParams: Promise<{ event?: string }>;
}) {
  const [{ entryId }, query] = await Promise.all([params, searchParams]);
  return <ConnectedEntry entryId={entryId} eventId={query.event ?? null} />;
}
