import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Clock, MapPin, ShieldAlert, User } from "lucide-react";

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
import { isSupportWorkerOnly } from "@/lib/rbac";
import { clockState, formatDuration } from "@/lib/incident-clock";
import type {
  IncidentSeverity,
  IncidentStatus,
  IncidentType,
} from "@prisma/client";

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
const TYPE_LABEL: Record<IncidentType, string> = {
  INJURY: "Injury",
  ABUSE: "Abuse",
  NEGLECT: "Neglect",
  UNLAWFUL_CONTACT: "Unlawful contact",
  UNAUTHORISED_RESTRICTIVE_PRACTICE: "Unauthorised restrictive practice",
  PROPERTY_DAMAGE: "Property damage",
  MEDICATION_ERROR: "Medication error",
  MISSING_PERSON: "Missing person",
  DEATH: "Death",
  OTHER: "Other",
};

export default async function AppIncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await resolvePortalContext("provider");

  const incident = await db.incident.findFirst({
    where: { id, orgId: context.activeOrg.id },
    include: {
      participant: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  if (!incident) notFound();

  // Support-worker-only users can only view incidents for participants
  // they have access to. Treat denial as not-found so the URL doesn't
  // leak that the incident exists.
  if (isSupportWorkerOnly(context) && incident.participant) {
    const grant = await db.workerParticipant.findFirst({
      where: {
        participantId: incident.participant.id,
        worker: { userId: context.user.id, orgId: context.activeOrg.id },
      },
      select: { id: true },
    });
    if (!grant) notFound();
  }

  const now = new Date();
  const state = clockState(incident, now);

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2"
        render={<Link href="/app/incidents" />}
      >
        <ArrowLeft />
        Incidents
      </Button>

      <header className="space-y-2">
        <p className="font-mono text-xs text-muted-foreground">
          INC-{incident.id.slice(-6).toUpperCase()}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={SEVERITY_VARIANT[incident.severity]}>
            {incident.severity.toLowerCase()}
          </Badge>
          <Badge variant="outline">{STATUS_LABEL[incident.status]}</Badge>
          {incident.severity === "REPORTABLE" &&
            state.kind === "overdue-unsubmitted" && (
              <Badge variant="destructive">
                Overdue {formatDuration(state.overdueByMs)}
              </Badge>
            )}
        </div>
        {incident.incidentType && (
          <h1 className="text-xl font-semibold tracking-tight">
            {TYPE_LABEL[incident.incidentType]}
          </h1>
        )}
      </header>

      <Card>
        <CardContent className="space-y-3 pt-6 text-sm">
          {incident.participant && (
            <Row icon={User}>
              {incident.participant.firstName} {incident.participant.lastName}
            </Row>
          )}
          <Row icon={Clock}>
            {format(incident.occurredAt, "dd/MM/yyyy, h:mm a")}
          </Row>
          {incident.location && <Row icon={MapPin}>{incident.location}</Row>}
        </CardContent>
      </Card>

      {incident.severity === "REPORTABLE" && (
        <Card
          className={
            state.kind === "overdue-unsubmitted"
              ? "border-destructive/40"
              : undefined
          }
        >
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-destructive" />
              <CardTitle className="text-base">NDIS 24-hour clock</CardTitle>
            </div>
            <CardDescription>
              {state.kind === "pending" &&
                `${formatDuration(state.remainingMs)} remaining to notify the NDIS Commission.`}
              {state.kind === "overdue-unsubmitted" &&
                `Overdue by ${formatDuration(state.overdueByMs)} — submit ASAP.`}
              {state.kind === "submitted-on-time" &&
                "Submitted within the 24-hour window."}
              {state.kind === "submitted-late" &&
                "Submitted after the 24-hour window."}
              {state.kind === "not-applicable" &&
                "Submission window not applicable."}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">What happened</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="whitespace-pre-wrap">{incident.description}</p>
          {incident.immediateActions && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Immediate actions
                </p>
                <p className="mt-1 whitespace-pre-wrap">
                  {incident.immediateActions}
                </p>
              </div>
            </>
          )}
          {incident.witnessNames && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Witnesses
              </p>
              <p className="mt-1">{incident.witnessNames}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {(incident.medicalAttention || incident.medicalNotes) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Medical</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Medical attention:</span>{" "}
              {incident.medicalAttention ? "Yes" : "No"}
            </p>
            {incident.medicalNotes && (
              <p className="whitespace-pre-wrap">{incident.medicalNotes}</p>
            )}
          </CardContent>
        </Card>
      )}

      {(incident.restrictivePractice || incident.restrictiveNotes) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Restrictive practice</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Used:</span>{" "}
              {incident.restrictivePractice ? "Yes" : "No"}
            </p>
            {incident.restrictiveNotes && (
              <p className="whitespace-pre-wrap">{incident.restrictiveNotes}</p>
            )}
          </CardContent>
        </Card>
      )}

      {incident.declarationName && incident.declarationSignedAt && (
        <Card>
          <CardContent className="pt-6 text-xs text-muted-foreground">
            Declared by{" "}
            <span className="font-medium text-foreground">
              {incident.declarationName}
            </span>{" "}
            on{" "}
            {format(incident.declarationSignedAt, "dd/MM/yyyy, h:mm a")}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Row({
  icon: Icon,
  children,
}: {
  icon: typeof Clock;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span>{children}</span>
    </div>
  );
}