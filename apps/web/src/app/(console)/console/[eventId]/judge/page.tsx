import { JudgeLineup } from "@/components/judge-lineup";
export default async function Page({params}:{params:Promise<{eventId:string}>}){return <JudgeLineup eventId={(await params).eventId}/>;}
