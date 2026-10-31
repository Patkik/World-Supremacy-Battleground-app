import { WorkflowUnavailable } from "@/components/workflow-unavailable";

export default function Page() {
  return <WorkflowUnavailable title="Guardian dependents" description="Manage the dancers for whom you are an authorized guardian." detail="Guardian relationships cannot be linked or verified here yet. This page does not record guardian consent." helpHref="/app/support" backHref="/app" />;
}
