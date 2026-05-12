import { FileBarChart } from "lucide-react";

import { ComingSoon } from "@/components/coming-soon";

export default function ReportsPage() {
  return (
    <ComingSoon
      title="Reports"
      description="Built-in reports for incidents, roster utilisation, and compliance status. Each report will be downloadable as PDF or CSV."
      icon={FileBarChart}
    />
  );
}