import { ConnectedEntry } from "@/components/connected-entry";
export default async function Page({params}:{params:Promise<{chapterId:string;eventId:string;entryId:string}>}){const value=await params;return <ConnectedEntry {...value} review/>;}
