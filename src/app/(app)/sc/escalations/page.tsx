import { AlertTriangle } from "lucide-react";

import { ComingSoonPage } from "@/components/coming-soon";
import { resolvePortalContext } from "@/lib/session";

export default async function SCEscalationsPage() {
  await resolvePortalContext("sc");

  return (
    <ComingSoonPage
      icon={AlertTriangle}
      pageTitle="Escalations"
      pageSubtitle="Crises the coordinator needs to act on now."
      status="Scoping"
      cardTitle="Escalations inbox is being scoped"
      cardDescription="An SC's day is interrupt-driven — roster changes, hospital admissions, reportable incidents, providers dropping participants. This inbox surfaces the urgent across the whole caseload."
      items={[
        {
          title: "Provider dropouts",
          description:
            "Notify the SC when a provider gives notice on a participant. Suggest emergency cover from the network.",
        },
        {
          title: "Hospital admissions",
          description:
            "Pause regular shifts when a participant is admitted; trigger discharge-planning workflow on the way out.",
        },
        {
          title: "Reportable incident notifications",
          description:
            "When a provider files a reportable incident on a participant, the SC sees it here with the relevant context.",
        },
        {
          title: "Roster change requests",
          description:
            "Provider asks to swap a worker on a participant — SC approves or pushes back in one click.",
        },
      ]}
      backHref="/sc"
      backLabel="Back to SC overview"
    />
  );
}