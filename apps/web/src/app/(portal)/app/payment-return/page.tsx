import Link from "next/link";
import { PageHeading } from "@/components/ui";
export default function Page() {
  return <main id="main-content" className="workspace-main"><PageHeading title="Check your payment status" description="Returning from a payment page does not confirm a settlement. Open your payment records to view the server’s current status." /><Link className="button button-volt" href="/app/payments">Open payment records</Link></main>;
}
