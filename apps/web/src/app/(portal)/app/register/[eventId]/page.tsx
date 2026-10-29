import {notFound} from "next/navigation";
import {RegistrationFlow} from "@/components/registration-flow";
export default async function Page({params}:{params:Promise<{eventId:string}>}){if((await params).eventId!=="demo")notFound();return <RegistrationFlow/>}
