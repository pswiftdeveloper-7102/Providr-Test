import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import { requireCoordinatorOrRedirect } from "../../../../../_helpers";

import { EditEngagementForm } from "./edit-engagement-form";

export default async function EditEngagementPage({
  params,
}: {
  params: Promise<{ id: string; engagementId: string }>;
}) {
  const { id, engagementId } = await params;
  const context = await resolvePortalContext("sc");
  requireCoordinatorOrRedirect(context, "/sc");

  const engagement = await db.scEngagement.findFirst({
    where: {
      id: engagementId,
      participant: { id, orgId: context.activeOrg.id },
    },
    include: {
      externalProvider: { select: { id: true, name: true } },
      participant: { select: { firstName: true, lastName: true } },
    },
  });
  if (!engagement) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Edit engagement
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {engagement.externalProvider.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          For {engagement.participant.firstName}{" "}
          {engagement.participant.lastName}
        </p>
      </header>

      <EditEngagementForm
        engagementId={engagement.id}
        cancelHref={`/sc/participants/${id}`}
        values={{
          status: engagement.status,
          startedAt: engagement.startedAt
            ? engagement.startedAt.toISOString().slice(0, 10)
            : "",
          endedAt: engagement.endedAt
            ? engagement.endedAt.toISOString().slice(0, 10)
            : "",
          serviceSummary: engagement.serviceSummary ?? "",
          notes: engagement.notes ?? "",
        }}
      />
    </div>
  );
}