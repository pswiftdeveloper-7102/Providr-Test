import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";

import { NewIncidentForm } from "./new-incident-form";

export default async function NewIncidentPage() {
  const context = await resolvePortalContext("provider");
  const orgId = context.activeOrg.id;

  const [participants, recentShifts] = await Promise.all([
    db.participant.findMany({
      where: { orgId },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
    db.shift.findMany({
      where: { orgId },
      orderBy: { scheduledStart: "desc" },
      take: 30,
      include: {
        worker: { select: { firstName: true, lastName: true } },
        participant: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          File an incident
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Mark severity as <strong>Reportable</strong> when the event meets
          NDIS reportable-incident criteria — the 24-hour submission clock
          starts when you file.
        </p>
      </header>

      <NewIncidentForm
        participants={participants.map((p) => ({
          id: p.id,
          name: `${p.firstName} ${p.lastName}`,
        }))}
        recentShifts={recentShifts.map((s) => ({
          id: s.id,
          label: `${s.worker.firstName} ${s.worker.lastName} → ${s.participant.firstName} ${s.participant.lastName}`,
          dateLabel: s.scheduledStart
            .toLocaleString("en-AU", {
              day: "numeric",
              month: "short",
              hour: "numeric",
              minute: "2-digit",
            }),
        }))}
      />
    </div>
  );
}