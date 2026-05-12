import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import { requireManager } from "@/lib/rbac";

import { BSPForm } from "../bsp-form";

export default async function EditBSPPage({
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

  const bsp = await db.behaviourSupportPlan.findFirst({
    where: {
      participantId: participant.id,
      orgId: context.activeOrg.id,
      status: { in: ["DRAFT", "ACTIVE"] },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!bsp) notFound();

  const authors = await db.worker.findMany({
    where: { orgId: context.activeOrg.id, type: "BEHAVIOUR_SUPPORT" },
    select: { id: true, firstName: true, lastName: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Edit Behaviour Support Plan
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          For {participant.firstName} {participant.lastName}
        </h1>
      </header>

      <BSPForm
        participantId={participant.id}
        bspId={bsp.id}
        values={{
          effectiveFrom: bsp.effectiveFrom
            ? bsp.effectiveFrom.toISOString()
            : null,
          effectiveTo: bsp.effectiveTo ? bsp.effectiveTo.toISOString() : null,
          authoredById: bsp.authoredById,
          summary: bsp.summary,
          triggers: bsp.triggers,
          deescalation: bsp.deescalation,
          whatNotToDo: bsp.whatNotToDo,
        }}
        cancelHref={`/provider/participants/${participant.id}`}
        authorOptions={authors}
      />
    </div>
  );
}