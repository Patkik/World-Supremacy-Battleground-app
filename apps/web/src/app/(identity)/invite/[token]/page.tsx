import { AcceptCrewInvite } from "@/components/accept-crew-invite";
export default async function Page({params,searchParams}:{params:Promise<{token:string}>;searchParams:Promise<{chapter?:string;crew?:string}>}){const [{token},query]=await Promise.all([params,searchParams]);return <AcceptCrewInvite token={token} chapter={query.chapter||null} crewId={query.crew||null}/>;}
