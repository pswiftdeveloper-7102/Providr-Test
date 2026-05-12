import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import { certStatus } from "@/lib/certificates";

import { NewShiftForm } from "./new-shift-form";

export default async function NewShiftPage() {
  const context = await resolvePortalContext("provider");
  const orgId = context.activeOrg.id;

  // Q1: detect hybrid (org holds both PROVIDER + SC entitlements).
  const orgEntitlements = await db.orgEntitlement.findMany({
    where: { orgId, active: true },
    select: { portal: true },
  });
  const isHybridOrg =
    orgEntitlements.some((e) => e.portal === "PROVIDER") &&
    orgEntitlements.some((e) => e.portal === "SC");

  const [workers, participants] = await Promise.all([
    db.worker.findMany({
      where: { orgId },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        ndisWorkerCheckExpiry: true,
        firstAidExpiry: true,
      },
    }),
    db.participant.findMany({
      where: { orgId },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        pronouns: true,
      },
    }),
  ]);

  // Q1: when hybrid, find participants this org also coordinates so the
  // form can show the conflict-of-interest disclosure on selection.
  let coiParticipantIds = new Set<string>();
  if (isHybridOrg) {
    const engagements = await db.scEngagement.findMany({
      where: {
        participantId: { in: participants.map((p) => p.id) },
        status: { in: ["PROPOSED", "AGREEMENT_SENT", "ACTIVE"] },
        externalProvider: { orgId },
      },
      select: { participantId: true },
    });
    coiParticipantIds = new Set(engagements.map((e) => e.participantId));
  }

  const workerOptions = workers.map((w) => ({
    id: w.id,
    name: `${w.firstName} ${w.lastName}`,
    ndisStatus: certStatus(w.ndisWorkerCheckExpiry),
    firstAidStatus: certStatus(w.firstAidExpiry),
    ndisExpiry: w.ndisWorkerCheckExpiry
      ? w.ndisWorkerCheckExpiry.toISOString()
      : null,
  }));

  const participantOptions = participants.map((p) => ({
    id: p.id,
    name: `${p.firstName} ${p.lastName}`,
    pronouns: p.pronouns,
    coiApplies: coiParticipantIds.has(p.id),
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">New shift</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Match a worker with a participant for a specific time window.
          {isHybridOrg
            ? " Workers with an expired NDIS Worker Check require an override reason. Participants this org also coordinates require a conflict-of-interest disclosure."
            : " Workers with an expired NDIS Worker Check require an override reason."}
        </p>
      </header>

      <NewShiftForm
        workers={workerOptions}
        participants={participantOptions}
      />
    </div>
  );
}