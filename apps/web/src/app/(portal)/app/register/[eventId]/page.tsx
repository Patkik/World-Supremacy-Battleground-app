import { RegistrationFlow } from "@/components/registration-flow";
import { ConnectedEntry } from "@/components/connected-entry";
export default async function Page({params}:{params:Promise<{eventId:string}>}){const {eventId}=await params;return eventId==="demo"?<RegistrationFlow/>:<ConnectedEntry eventId={eventId}/>;}
