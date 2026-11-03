import { DivisionPolicyDrafts } from "@/components/division-policy-drafts";

export default function DivisionPoliciesPage({ params }: { params: Promise<{ chapterId: string; eventId: string }> }) {
  return <DivisionPolicyDrafts params={params} />;
}
