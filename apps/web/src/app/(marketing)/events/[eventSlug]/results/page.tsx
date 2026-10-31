import { PublishedEventResults } from "@/components/published-event-results";
export default async function Page({params}:{params:Promise<{eventSlug:string}>}){return <PublishedEventResults eventId={(await params).eventSlug} arena={false}/>;}
