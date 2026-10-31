import { WorkflowUnavailable } from "@/components/workflow-unavailable";

export default function Page() {
  return <WorkflowUnavailable title="Consent and waivers" description="Review and sign the documents required for your event." detail="Consent documents and signatures are not available here yet. This page cannot show or record signed waivers." helpHref="/app/support" backHref="/app" />;
}
