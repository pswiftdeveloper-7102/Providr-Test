import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { format, differenceInCalendarDays } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";

import { ResolveEscalationForm } from "./resolve-form";

const TYPE_LABEL: Record<string, string> = {
  PROVIDER_DROP: "Provider drop",
  HOSPITAL: "Hospital",
  REPORTABLE_INCIDENT: "Reportable incident",
  FAMILY_ISSUE: "Family issue",
  EMERGENCY_COVER: "Emergency cover",
  PLAN_BREACH: "Plan breach",
  OTHER: "Other",
};

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  OPEN: "destructive",
  IN_PROGRESS: "secondary",
  RESOLVED: "outline",
};

export default async function EscalationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await resolvePortalContext("sc");
  const now = new Date();

  const escalation = await db.escalation.findFirst({
    where: { id, orgId: context.activeOrg.id },
    include: {
      participant: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  if (!escalation) notFound();

  const days = differenceInCalendarDays(now, escalation.openedAt);
  const isProviderDrop = escalation.type === "PROVIDER_DROP";

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" render={<Link href="/sc/escalations" />}>
        <ArrowLeft />
        All escalations
      </Button>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Escalation
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {TYPE_LABEL[escalation.type]}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            For{" "}
            <Link
              href={`/sc/participants/${escalation.participant.id}`}
              className="font-medium text-foreground hover:underline"
            >
              {escalation.participant.firstName}{" "}
              {escalation.participant.lastName}
            </Link>
            {" · "}
            opened {days === 0 ? "today" : `${days}d ago`} ·{" "}
            {format(escalation.openedAt, "dd/MM/yyyy h:mm a")}
          </p>
        </div>
        <Badge variant={STATUS_VARIANT[escalation.status]}>
          {escalation.status.toLowerCase().replace("_", " ")}
        </Badge>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>What happened</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">{escalation.description}</p>
        </CardContent>
      </Card>

      {isProviderDrop && escalation.status !== "RESOLVED" && (
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <div>
                <CardTitle>Find emergency cover</CardTitle>
                <CardDescription>
                  Open the provider directory pre-filtered to who&apos;s
                  accepting.
                </CardDescription>
              </div>
            </div>
            <CardAction>
              <Button
                size="sm"
                render={<Link href="/sc/providers?filter=accepting" />}
              >
                Browse providers
              </Button>
            </CardAction>
          </CardHeader>
        </Card>
      )}

      {escalation.status === "RESOLVED" ? (
        <Card>
          <CardHeader>
            <CardTitle>Resolution</CardTitle>
            <CardDescription>
              Closed{" "}
              {escalation.resolvedAt
                ? format(escalation.resolvedAt, "dd/MM/yyyy h:mm a")
                : ""}
              .
            </CardDescription>
          </CardHeader>
          {escalation.resolution && (
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">
                {escalation.resolution}
              </p>
              <Separator className="my-4" />
              <ResolveEscalationForm
                escalationId={escalation.id}
                initialStatus="RESOLVED"
                initialResolution={escalation.resolution ?? ""}
                reopenLabel="Update / reopen"
              />
            </CardContent>
          )}
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Update status</CardTitle>
            <CardDescription>
              Move it to in-progress while you work it, or resolve when it&apos;s
              done.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResolveEscalationForm
              escalationId={escalation.id}
              initialStatus={escalation.status as "OPEN" | "IN_PROGRESS"}
              initialResolution={escalation.resolution ?? ""}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}