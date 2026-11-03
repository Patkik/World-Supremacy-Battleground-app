import { WorkflowUnavailable } from "@/components/workflow-unavailable";
export default function PassesPage() {
  return <WorkflowUnavailable title="Venue passes" description="Your event access credentials." detail="Personal digital passes are not connected yet. No pass has been issued by this screen; contact the event team for venue access instructions." helpHref="/app/support" backHref="/app" />;
}
