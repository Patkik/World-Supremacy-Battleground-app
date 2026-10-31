import { PaymentRecords } from "@/components/payment-records";
export default async function Page({params}:{params:Promise<{chapterId:string}>}){return <PaymentRecords chapterId={(await params).chapterId}/>;}
