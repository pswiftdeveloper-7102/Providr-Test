import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import { SEVERITY_LABEL } from "@/lib/incident-clock";
import type { IncidentSeverity, IncidentStatus } from "@prisma/client";

import { LiveIncidentClock } from "./live-clock";
import { NdisSubmissionControls } from "./ndis-submission-controls";

const SEVERITY_VARIANT: Record<
  IncidentSeverity,
  "default" | "secondary" | "outline" | "destructive"
> = {
  MINOR: "outline",
  MODERATE: "secondary",
  SERIOUS: "default",
  REPORTABLE: "destructive",
};

const STATUS_LABEL: Record<IncidentStatus, string> = {
  DRAFT: "Draft",
  REPORTED: "Reported",
  UNDER_REVIEW: "Under review",
  CLOSED: "Closed",
};

export default async function IncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await resolvePortalContext("provider");

  const incident = await db.incident.findFirst({
    where: { id, orgId: context.activeOrg.id },
    include: {
      participant: {
        select: { id: true, firstName: true, lastName: true },
      },
      shift: {
        select: {
          id: true,
          scheduledStart: true,
          worker: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });
  if (!incident) notFound();

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        render={<Link href="/provider/incidents" />}
      >
        <ArrowLeft />
        Back to incidents
      </Button>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Incident
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {incident.participant
              ? `${incident.participant.firstName} ${incident.participant.lastName}`
              : "Unassigned"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Occurred {format(incident.occurredAt, "EEE d MMM yyyy, h:mm a")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={SEVERITY_VARIANT[incident.severity]}>
            {SEVERITY_LABEL[incident.severity]}
          </Badge>
          <Badge variant="outline">{STATUS_LABEL[incident.status]}</Badge>
        </div>
      </header>

      <LiveIncidentClock
        severity={incident.severity}
        reportedAtIso={incident.reportedAt?.toISOString() ?? null}
        reportedToNdisAtIso={incident.reportedToNdisAt?.toISOString() ?? null}
      />

      {incident.severity === "REPORTABLE" && (
        <NdisSubmissionControls
          incidentId={incident.id}
          reportedToNdisAt={incident.reportedToNdisAt}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>What happened</CardTitle>
          <CardDescription>
            Captured by the person filing the incident.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm whitespace-pre-wrap">{incident.description}</p>

          {incident.immediateActions && (
            <>
              <Separator />
              <div>
                <div className="text-sm font-semibold">
                  Immediate actions taken
                </div>
                <p className="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">
                  {incident.immediateActions}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Context</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="Participant">
            {incident.participant ? (
              <Link
                href={`/provider/participants/${incident.participant.id}`}
                className="hover:underline"
              >
                {incident.participant.firstName}{" "}
                {incident.participant.lastName}
              </Link>
            ) : (
              "—"
            )}
          </Row>
          <Row label="Linked shift">
            {incident.shift ? (
              <Link
                href={`/provider/shifts/${incident.shift.id}`}
                className="hover:underline"
              >
                {incident.shift.worker.firstName}{" "}
                {incident.shift.worker.lastName} ·{" "}
                {format(incident.shift.scheduledStart, "dd/MM h:mm a")}
              </Link>
            ) : (
              <span className="text-muted-foreground">No shift linked</span>
            )}
          </Row>
          <Row label="Reported at (24h clock start)">
            {incident.reportedAt
              ? format(incident.reportedAt, "dd/MM/yyyy h:mm a")
              : "—"}
          </Row>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}