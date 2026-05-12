import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import { requireManager } from "@/lib/rbac";

import { ImportPlanFlow } from "./import-plan-flow";

export default async function ImportPlanPage({
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

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Import NDIS plan from PDF
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          For {participant.firstName} {participant.lastName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload the participant&apos;s plan PDF. We&apos;ll read the dates and
          bucket totals out of it — you&apos;ll review every field before
          anything is saved.
        </p>
      </header>

      <ImportPlanFlow
        participantId={participant.id}
        cancelHref={`/provider/participants/${participant.id}`}
      />
    </div>
  );
}