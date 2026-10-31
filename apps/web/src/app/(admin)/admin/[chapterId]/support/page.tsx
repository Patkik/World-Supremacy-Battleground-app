import { SupportWorkspace } from "@/components/support-workspace";
export default async function Page({params}:{params:Promise<{chapterId:string}>}){return <SupportWorkspace chapterId={(await params).chapterId}/>;}
