import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import { requireCoordinatorOrRedirect } from "../../../../../_helpers";

import { EditSpendForm } from "./edit-spend-form";

export default async function EditSpendPage({
  params,
}: {
  params: Promise<{ id: string; spendId: string }>;
}) {
  const { id, spendId } = await params;
  const context = await resolvePortalContext("sc");
  requireCoordinatorOrRedirect(context, "/sc");

  const spend = await db.spendEntry.findFirst({
    where: {
      id: spendId,
      orgId: context.activeOrg.id,
      planBudget: { plan: { participantId: id } },
    },
  });
  if (!spend) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Edit spend
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {spend.description}
        </h1>
      </header>

      <EditSpendForm
        spendId={spend.id}
        cancelHref={`/sc/participants/${id}`}
        values={{
          amount: (spend.amountCents / 100).toString(),
          occurredAt: spend.occurredAt.toISOString().slice(0, 10),
          description: spend.description,
          providerName: spend.providerName ?? "",
        }}
      />
    </div>
  );
}