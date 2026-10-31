import Link from "next/link";
import { PageHeading } from "@/components/ui";
export default async function Page({params}: {params: Promise<{eventId:string}>}) {
  const {eventId} = await params;
  return <main id="main-content" className="workspace-main"><PageHeading title="Review saved commands" description="Review and queue each score from its assigned scorecard. Submission requires a server receipt."/><Link className="button button-volt" href={`/console/${encodeURIComponent(eventId)}/sync`}>Open saved scores</Link></main>;
}
