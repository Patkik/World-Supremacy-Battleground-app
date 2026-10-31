import { PublishedEventResults } from "@/components/published-event-results";
export default async function Page({params}:{params:Promise<{eventSlug:string;entryId:string}>}){const {eventSlug,entryId}=await params;return <PublishedEventResults eventId={eventSlug} entryId={entryId}/>;}
