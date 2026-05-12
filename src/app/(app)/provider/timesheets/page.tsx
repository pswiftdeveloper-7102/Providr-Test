import { Clock } from "lucide-react";

import { ComingSoon } from "@/components/coming-soon";

export default function TimesheetsPage() {
  return (
    <ComingSoon
      title="Timesheets"
      description="Hours worked per worker derived from shift clock-in/out events. Source of truth for payroll exports."
      icon={Clock}
    />
  );
}