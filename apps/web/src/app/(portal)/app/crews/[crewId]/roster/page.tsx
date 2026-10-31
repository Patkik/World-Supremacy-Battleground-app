import { ConnectedCrews } from "@/components/connected-crews";
export default async function Page({params}:{params:Promise<{crewId:string}>}){return <ConnectedCrews crewId={(await params).crewId}/>;}
