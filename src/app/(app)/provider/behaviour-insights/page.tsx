import { Brain } from "lucide-react";

import { ComingSoon } from "@/components/coming-soon";

export default function BehaviourInsightsPage() {
  return (
    <ComingSoon
      title="Behaviour Insights"
      description="Trends and patterns across incidents, restraints, and behaviour support plans. This view aggregates what the Incident and BSP records already capture into a single analytical lens."
      icon={Brain}
    />
  );
}