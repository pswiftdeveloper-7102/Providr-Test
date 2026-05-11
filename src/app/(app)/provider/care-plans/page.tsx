import { HeartPulse } from "lucide-react";

import { ComingSoonPage } from "@/components/coming-soon";
import { resolvePortalContext } from "@/lib/session";

export default async function CarePlansPage() {
  await resolvePortalContext("provider");

  return (
    <ComingSoonPage
      icon={HeartPulse}
      pageTitle="Care plans"
      pageSubtitle="Per-participant plan of what to deliver, by whom, for how long."
      cardTitle="Care plans are being built"
      cardDescription="Phase 3 of the participant lifecycle. The care plan turns the NDIS plan budget into actual hours, workers, and goals."
      items={[
        {
          title: "Goals from the NDIS plan",
          description:
            "Pull goals from the participant's plan and link supports to each one. Year-end evidence maps back automatically.",
        },
        {
          title: "Supports and hours",
          description:
            "Allocate hours per support category against the Core / Capacity / Capital budgets.",
        },
        {
          title: "Preferred workers",
          description:
            "Mark which workers the participant already knows so rostering proposes them first.",
        },
        {
          title: "Review cadence",
          description:
            "Trigger care plan review at month 11 of the plan, ahead of the NDIS yearly review.",
        },
      ]}
    />
  );
}