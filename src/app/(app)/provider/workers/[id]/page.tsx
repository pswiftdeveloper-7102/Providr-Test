import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import { requireManager } from "@/lib/rbac";

import { InvitePanel } from "./invite-panel";
import { TrainingSection } from "./training-section";
import { WorkerEditForm } from "./worker-edit-form";

export default async function WorkerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await resolvePortalContext("provider");
  requireManager(context);

  const worker = await db.worker.findFirst({
    where: { id, orgId: context.activeOrg.id },
    include: {
      trainingRecords: {
        orderBy: { completedAt: "desc" },
      },
    },
  });
  if (!worker) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Support worker
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {worker.firstName} {worker.lastName}
        </h1>
      </header>

      <WorkerEditForm
        worker={{
          id: worker.id,
          firstName: worker.firstName,
          lastName: worker.lastName,
          email: worker.email,
          phone: worker.phone,
          ndisWorkerCheckExpiry: worker.ndisWorkerCheckExpiry,
          firstAidExpiry: worker.firstAidExpiry,
        }}
      />

      <InvitePanel
        workerId={worker.id}
        hasLogin={!!worker.userId}
        workerEmail={worker.email}
        workerFirstName={worker.firstName}
      />

      <TrainingSection workerId={worker.id} records={worker.trainingRecords} />
    </div>
  );
}