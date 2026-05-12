import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import { requireCoordinatorOrRedirect } from "../../../../../_helpers";

import { PlanForm } from "../../plan-form";

export default async function EditSCPlanPage({
  params,
}: {
  params: Promise<{ id: string; planId: string }>;
}) {
  const { id, planId } = await params;
  const context = await resolvePortalContext("sc");
  requireCoordinatorOrRedirect(context, "/sc");

  const plan = await db.plan.findFirst({
    where: {
      id: planId,
      participant: { id, orgId: context.activeOrg.id },
    },
    include: { budgets: true },
  });
  if (!plan) notFound();

  const buckets = {
    CORE: plan.budgets.find((b) => b.category === "CORE"),
    CAPACITY: plan.budgets.find((b) => b.category === "CAPACITY"),
    CAPITAL: plan.budgets.find((b) => b.category === "CAPITAL"),
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Edit plan
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {plan.ndisPlanNumber ?? "NDIS plan"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reallocate buckets, refresh dates, replace the plan PDF.
        </p>
      </header>

      <PlanForm
        participantId={id}
        planId={plan.id}
        cancelHref={`/sc/participants/${id}`}
        values={{
          ndisPlanNumber: plan.ndisPlanNumber ?? "",
          startDate: plan.startDate.toISOString().slice(0, 10),
          endDate: plan.endDate.toISOString().slice(0, 10),
          coreDollars: ((buckets.CORE?.totalCents ?? 0) / 100).toString(),
          capacityDollars: ((buckets.CAPACITY?.totalCents ?? 0) / 100).toString(),
          capitalDollars: ((buckets.CAPITAL?.totalCents ?? 0) / 100).toString(),
          planFileName: plan.planFileName,
          spentByCategory: {
            CORE: buckets.CORE?.spentCents ?? 0,
            CAPACITY: buckets.CAPACITY?.spentCents ?? 0,
            CAPITAL: buckets.CAPITAL?.spentCents ?? 0,
          },
        }}
      />
    </div>
  );
}