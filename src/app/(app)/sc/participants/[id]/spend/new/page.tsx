import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import { requireCoordinatorOrRedirect } from "../../../../_helpers";

import { LogSpendForm } from "./log-spend-form";

export default async function NewSpendPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await resolvePortalContext("sc");
  requireCoordinatorOrRedirect(context, "/sc");

  const participant = await db.participant.findFirst({
    where: { id, orgId: context.activeOrg.id },
    include: {
      plans: {
        where: { status: "ACTIVE" },
        include: { budgets: true },
        take: 1,
      },
    },
  });
  if (!participant) notFound();

  const plan = participant.plans[0];
  if (!plan) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <p className="text-sm">
          No active plan for {participant.firstName} {participant.lastName} —
          add one before logging spend.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Log spend
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          For {participant.firstName} {participant.lastName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          SC Job 4 — track invoices against the right bucket so the year
          stays on track.
        </p>
      </header>

      <LogSpendForm
        participantId={participant.id}
        buckets={plan.budgets.map((b) => ({
          id: b.id,
          category: b.category,
          totalCents: b.totalCents,
          spentCents: b.spentCents,
        }))}
        cancelHref={`/sc/participants/${participant.id}`}
      />
    </div>
  );
}