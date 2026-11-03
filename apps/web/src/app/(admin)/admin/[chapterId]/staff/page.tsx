import { use } from "react";
import { StaffMembershipWorkspace } from "@/components/staff-membership-workspace";

export default function StaffManagementPage({ params }: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = use(params);
  return <StaffMembershipWorkspace chapterId={chapterId} />;
}
