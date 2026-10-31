import { RegistrationList } from "@/components/registration-list";
export default async function Page({params}:{params:Promise<{chapterId:string;eventId:string}>}){return <RegistrationList {...await params}/>;}
