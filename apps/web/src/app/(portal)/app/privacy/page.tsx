import { WorkflowUnavailable } from "@/components/workflow-unavailable";
export default function PrivacyPage() {
  return <WorkflowUnavailable title="Privacy and data requests" description="Manage questions about your personal data." detail="Consent preferences, data exports and deletion requests are not connected here yet. No request or preference change is recorded on this page." helpHref="/app/support" backHref="/app" />;
}
