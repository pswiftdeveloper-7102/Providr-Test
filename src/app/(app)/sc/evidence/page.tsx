import { FileText } from "lucide-react";

import { ComingSoonPage } from "@/components/coming-soon";
import { resolvePortalContext } from "@/lib/session";

export default async function SCEvidencePage() {
  await resolvePortalContext("sc");

  return (
    <ComingSoonPage
      icon={FileText}
      pageTitle="Evidence"
      pageSubtitle="Annual evidence pack for the NDIA plan review."
      status="Scoping"
      cardTitle="Evidence builder is being scoped"
      cardDescription="Today's records justify next year's plan. This page bundles the year's progress notes, incidents, and goal progress — mapped to NDIS rules — for the plan review meeting."
      items={[
        {
          title: "Gather all the notes",
          description:
            "Pull progress notes, incident reports, and therapy reports from every provider on the plan.",
        },
        {
          title: "Map to NDIS rules",
          description:
            "Tag evidence against each plan goal so reviewers can see what worked and what's still needed.",
        },
        {
          title: "Show what's needed for next plan",
          description:
            "Draft the next-plan ask from the year's evidence — supports requested, hours, capital items.",
        },
        {
          title: "PDF / digital export",
          description:
            "Submit digitally to NDIA where supported, or print a clean PDF for the review meeting.",
        },
      ]}
      backHref="/sc"
      backLabel="Back to SC overview"
    />
  );
}