import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import { requireManager } from "@/lib/rbac";

import { CarePlanForm } from "../new/care-plan-form";

export default async function EditCarePlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await resolvePortalContext("provider");
  requireManager(context);

  const participant = await db.participant.findFirst({
    where: { id, orgId: context.activeOrg.id },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!participant) notFound();

  const carePlan = await db.carePlan.findFirst({
    where: {
      participantId: participant.id,
      orgId: context.activeOrg.id,
      status: { in: ["DRAFT", "ACTIVE"] },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!carePlan) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Edit care plan
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          For {participant.firstName} {participant.lastName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Support workers see the context fields read-only on every shift.
        </p>
      </header>

      <CarePlanForm
        participantId={participant.id}
        carePlanId={carePlan.id}
        values={{
          effectiveFrom: carePlan.effectiveFrom
            ? carePlan.effectiveFrom.toISOString()
            : null,
          effectiveTo: carePlan.effectiveTo
            ? carePlan.effectiveTo.toISOString()
            : null,
          summary: carePlan.summary,
          communicationPreferences: carePlan.communicationPreferences,
          medicalConditions: carePlan.medicalConditions,
          allergies: carePlan.allergies,
          risks: carePlan.risks,
          emergencyContacts: carePlan.emergencyContacts,
          culturalConsiderations: carePlan.culturalConsiderations,
        }}
        cancelHref={`/provider/participants/${participant.id}`}
      />
    </div>
  );
}