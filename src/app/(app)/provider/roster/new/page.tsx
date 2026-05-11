import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import { certStatus } from "@/lib/certificates";

import { NewShiftForm } from "./new-shift-form";

export default async function NewShiftPage() {
  const context = await resolvePortalContext("provider");
  const orgId = context.activeOrg.id;

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

  // Pre-compute cert status on the server so the client form can
  // visually flag expired/expiring workers without re-deriving.
  const workerOptions = workers.map((w) => ({
    id: w.id,
    name: `${w.firstName} ${w.lastName}`,
    ndisStatus: certStatus(w.ndisWorkerCheckExpiry),
    firstAidStatus: certStatus(w.firstAidExpiry),
  }));

  const participantOptions = participants.map((p) => ({
    id: p.id,
    name: `${p.firstName} ${p.lastName}`,
    pronouns: p.pronouns,
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">New shift</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Match a worker with a participant for a specific time window.
          Workers with an expired NDIS Worker Check can&apos;t be rostered.
        </p>
      </header>

      <NewShiftForm
        workers={workerOptions}
        participants={participantOptions}
      />
    </div>
  );
}