import { ConnectedEntry } from "@/components/connected-entry";
export default async function Page({params,searchParams}:{params:Promise<{entryId:string}>;searchParams:Promise<{event?:string}>}){const [{entryId},query]=await Promise.all([params,searchParams]);return <ConnectedEntry eventId={query.event||null} entryId={entryId} review/>;}
