import { WorkflowUnavailable } from "@/components/workflow-unavailable";
export default function TicketsPage() {
  return <WorkflowUnavailable title="Tickets" description="Your event tickets." detail="Ticket purchase history and digital tickets are not connected yet. Contact the event team about an existing purchase." helpHref="/app/support" backHref="/app" />;
}
