import { ConnectedRoster } from "@/components/connected-roster";
export default async function Page({params,searchParams}:{params:Promise<{entryId:string}>;searchParams:Promise<{event?:string}>}) {
  const [{entryId},query]=await Promise.all([params,searchParams]);
  return <ConnectedRoster entryId={entryId} eventId={query.event||null}/>;
}
