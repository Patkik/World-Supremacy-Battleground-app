import { PublishedEventResults } from "@/components/published-event-results";
export default async function Page({params}:{params:Promise<{eventId:string}>}){return <PublishedEventResults eventId={(await params).eventId} arena={true}/>;}
