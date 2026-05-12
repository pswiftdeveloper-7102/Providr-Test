import Link from "next/link";
import { notFound } from "next/navigation";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";

import { PlanForm } from "./plan-form";

export default async function NewPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await resolvePortalContext("provider");

  const participant = await db.participant.findFirst({
    where: { id, orgId: context.activeOrg.id },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!participant) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            New NDIS plan
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            For {participant.firstName} {participant.lastName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Capture the plan dates and the three bucket totals. Spend is
            tracked per bucket from here.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          render={
            <Link
              href={`/provider/participants/${participant.id}/plans/import`}
            />
          }
        >
          <Sparkles />
          Import from PDF instead
        </Button>
      </header>

      <PlanForm
        participantId={participant.id}
        cancelHref={`/provider/participants/${participant.id}`}
      />
    </div>
  );
}