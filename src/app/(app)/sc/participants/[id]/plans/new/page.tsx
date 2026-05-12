import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import { requireCoordinatorOrRedirect } from "../../../../_helpers";

import { PlanForm } from "../plan-form";

export default async function NewSCPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await resolvePortalContext("sc");
  requireCoordinatorOrRedirect(context, "/sc");

  const participant = await db.participant.findFirst({
    where: { id, orgId: context.activeOrg.id },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!participant) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          New plan
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          For {participant.firstName} {participant.lastName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          SC Job 1 — decode the participant&apos;s NDIS plan into Core,
          Capacity, and Capital buckets.
        </p>
      </header>

      <PlanForm
        participantId={participant.id}
        cancelHref={`/sc/participants/${participant.id}`}
      />
    </div>
  );
}