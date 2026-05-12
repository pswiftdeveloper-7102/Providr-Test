import { PalmtreeIcon } from "lucide-react";

import { ComingSoon } from "@/components/coming-soon";

export default function LeavePage() {
  return (
    <ComingSoon
      title="Leave"
      description="Annual leave, personal leave, and other approved absences. Approved leave automatically blocks roster assignment for that period."
      icon={PalmtreeIcon}
    />
  );
}