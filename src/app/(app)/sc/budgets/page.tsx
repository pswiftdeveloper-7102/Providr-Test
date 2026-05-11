import { Wallet } from "lucide-react";

import { ComingSoonPage } from "@/components/coming-soon";
import { resolvePortalContext } from "@/lib/session";

export default async function SCBudgetsPage() {
  await resolvePortalContext("sc");

  return (
    <ComingSoonPage
      icon={Wallet}
      pageTitle="Budgets"
      pageSubtitle="Watch the money across all participants and providers."
      status="Scoping"
      cardTitle="Budget tracking is being scoped"
      cardDescription="With the SC role merging into plan management, this view will cover both watching spend pace and approving provider invoices — not just one or the other."
      items={[
        {
          title: "Spend pace per participant",
          description:
            "Core / Capacity / Capital burn rate against time elapsed on the plan. Flag participants tracking to overspend.",
        },
        {
          title: "Cross-provider totals",
          description:
            "Roll up monthly spend across every provider working with a participant — one number, not five separate statements.",
        },
        {
          title: "Reallocation suggestions",
          description:
            "Surface where Capacity is under-spent and Core is at risk, before it becomes a crisis.",
        },
        {
          title: "Monthly statement export",
          description:
            "Auto-build the statement the participant gets each month, in plain English.",
        },
      ]}
      backHref="/sc"
      backLabel="Back to SC overview"
    />
  );
}