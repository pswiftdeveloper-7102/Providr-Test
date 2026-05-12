import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import { requireManager } from "@/lib/rbac";

import { BSPForm } from "../bsp-form";

export default async function NewBSPPage({
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

  // Behaviour support practitioners eligible to author the plan.
  const authors = await db.worker.findMany({
    where: { orgId: context.activeOrg.id, type: "BEHAVIOUR_SUPPORT" },
    select: { id: true, firstName: true, lastName: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          New Behaviour Support Plan
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          For {participant.firstName} {participant.lastName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A clinical document that guides every shift. Support workers see
          it read-only.
        </p>
      </header>

      <BSPForm
        participantId={participant.id}
        cancelHref={`/provider/participants/${participant.id}`}
        authorOptions={authors}
      />
    </div>
  );
}