import { Users } from "lucide-react";

import { ComingSoonPage } from "@/components/coming-soon";
import { resolvePortalContext } from "@/lib/session";

export default async function SCParticipantsPage() {
  await resolvePortalContext("sc");

  return (
    <ComingSoonPage
      icon={Users}
      pageTitle="Participants"
      pageSubtitle="Your coordination caseload."
      status="Scoping"
      cardTitle="Caseload view is being scoped for the new SC market"
      cardDescription="The Support Coordination role is being restructured by NDIA — funding cut and the role merging with plan management. We're shaping this for the world that's coming, not the one that's leaving."
      items={[
        {
          title: "Caseload at a glance",
          description:
            "Each participant on one row — plan dates, providers in play, last contact, next review.",
        },
        {
          title: "Complex-needs flag",
          description:
            "Surface participants who still qualify for SC under the new rules.",
        },
        {
          title: "Cross-provider view",
          description:
            "See the workers, therapy, and behaviour-support teams attached to each participant across organisations.",
        },
      ]}
      backHref="/sc"
      backLabel="Back to SC overview"
    />
  );
}