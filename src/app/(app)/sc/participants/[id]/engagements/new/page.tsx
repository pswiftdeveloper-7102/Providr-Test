import { notFound } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import { requireCoordinatorOrRedirect } from "../../../../_helpers";

import { EngagementForm } from "./engagement-form";

export default async function NewEngagementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await resolvePortalContext("sc");
  requireCoordinatorOrRedirect(context, "/sc");

  const participant = await db.participant.findFirst({
    where: { id, orgId: context.activeOrg.id },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!participant) notFound();

  const providers = await db.externalProvider.findMany({
    where: { orgId: context.activeOrg.id },
    select: {
      id: true,
      name: true,
      capacityStatus: true,
      serviceCategories: true,
    },
    orderBy: { name: "asc" },
  });

  if (providers.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>No providers in your directory yet</CardTitle>
            <CardDescription>
              Add a provider before engaging them with{" "}
              {participant.firstName}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button render={<Link href="/sc/providers/new" />}>
              Add a provider
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Engage provider
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          For {participant.firstName} {participant.lastName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          SC Job 3 — set up the team.
        </p>
      </header>

      <EngagementForm
        participantId={participant.id}
        providers={providers}
        cancelHref={`/sc/participants/${participant.id}`}
      />
    </div>
  );
}