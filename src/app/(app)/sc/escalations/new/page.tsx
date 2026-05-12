import { resolvePortalContext } from "@/lib/session";
import { db } from "@/lib/db";
import { requireCoordinatorOrRedirect } from "../../_helpers";

import { NewEscalationForm } from "./new-escalation-form";

export default async function NewEscalationPage({
  searchParams,
}: {
  searchParams: Promise<{ participantId?: string }>;
}) {
  const sp = await searchParams;
  const context = await resolvePortalContext("sc");
  requireCoordinatorOrRedirect(context, "/sc");

  const participants = await db.participant.findMany({
    where: { orgId: context.activeOrg.id },
    select: { id: true, firstName: true, lastName: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Log escalation
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          What just happened?
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          SC Job 5 — capture it now so it doesn&apos;t disappear into the day.
        </p>
      </header>

      <NewEscalationForm
        participants={participants}
        defaultParticipantId={sp.participantId ?? ""}
        cancelHref="/sc/escalations"
      />
    </div>
  );
}