import { ConnectedCheckout } from "@/components/connected-checkout";
export default async function Page({ params, searchParams }: { params: Promise<{ entryId: string }>; searchParams: Promise<{event?: string}> }) {
  const [{entryId}, query] = await Promise.all([params, searchParams]);
  return <ConnectedCheckout entryId={entryId} eventId={query.event || null} />;
}
