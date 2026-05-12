import { AlertTriangle, Plus, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import {
  clockState,
  formatDuration,
  SEVERITY_LABEL,
} from "@/lib/incident-clock";
import type { IncidentSeverity, IncidentStatus } from "@prisma/client";

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

export default async function IncidentsListPage() {
  const context = await resolvePortalContext("provider");

  const incidents = await db.incident.findMany({
    where: { orgId: context.activeOrg.id },
    include: {
      participant: { select: { firstName: true, lastName: true } },
    },
    orderBy: { occurredAt: "desc" },
  });

  const now = new Date();

  // "Action needed": REPORTABLE incidents not yet submitted to NDIS,
  // pending or already overdue. These get a dedicated section at the top.
  const actionNeeded = incidents
    .map((i) => ({ incident: i, state: clockState(i, now) }))
    .filter(
      (x) =>
        x.state.kind === "pending" || x.state.kind === "overdue-unsubmitted"
    );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Incidents</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Reportable incidents must be notified to the NDIS Commission
            within 24 hours of management becoming aware.
          </p>
        </div>
        <Button render={<Link href="/provider/incidents/new" />}>
          <Plus />
          File incident
        </Button>
      </header>

      {actionNeeded.length > 0 && (
        <Card className="border-destructive/40">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-destructive" />
              <CardTitle className="text-destructive">
                Action needed
              </CardTitle>
            </div>
            <CardDescription>
              Reportable incidents waiting to be submitted to NDIS.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {actionNeeded.map(({ incident, state }) => {
              const overdue = state.kind === "overdue-unsubmitted";
              return (
                <Link
                  key={incident.id}
                  href={`/provider/incidents/${incident.id}`}
                  className="block"
                >
                  <Alert variant={overdue ? "destructive" : "default"}>
                    <AlertTriangle />
                    <AlertTitle className="flex flex-wrap items-center gap-2">
                      <span>
                        {incident.participant?.firstName}{" "}
                        {incident.participant?.lastName}
                      </span>
                      <span className="text-xs font-normal text-muted-foreground">
                        · occurred {format(incident.occurredAt, "dd/MM h:mm a")}
                      </span>
                    </AlertTitle>
                    <AlertDescription>
                      {overdue ? (
                        <span className="font-medium text-destructive">
                          Overdue by{" "}
                          {state.kind === "overdue-unsubmitted"
                            ? formatDuration(state.overdueByMs)
                            : "—"}
                          {" "}— submit to NDIS as soon as possible.
                        </span>
                      ) : (
                        <span>
                          {state.kind === "pending"
                            ? `${formatDuration(state.remainingMs)} remaining to submit to NDIS.`
                            : ""}
                        </span>
                      )}
                    </AlertDescription>
                  </Alert>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      )}

      {incidents.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No incidents on file</CardTitle>
            <CardDescription>
              When something goes wrong on a shift, file it here. Reportable
              items trigger the 24-hour NDIS clock.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button render={<Link href="/provider/incidents/new" />}>
              <Plus />
              File the first incident
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All incidents</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Occurred</TableHead>
                <TableHead>Participant</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">NDIS clock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incidents.map((incident) => {
                const state = clockState(incident, now);
                return (
                  <TableRow key={incident.id}>
                    <TableCell>
                      <Link
                        href={`/provider/incidents/${incident.id}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {format(incident.occurredAt, "dd/MM/yyyy h:mm a")}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">
                      {incident.participant?.firstName}{" "}
                      {incident.participant?.lastName ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={SEVERITY_VARIANT[incident.severity]}>
                        {SEVERITY_LABEL[incident.severity]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {STATUS_LABEL[incident.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <ClockSummary state={state} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

function ClockSummary({
  state,
}: {
  state: ReturnType<typeof clockState>;
}) {
  if (state.kind === "not-applicable")
    return <span className="text-xs text-muted-foreground">—</span>;
  if (state.kind === "pending")
    return (
      <span className="text-xs text-amber-700">
        {formatDuration(state.remainingMs)} left
      </span>
    );
  if (state.kind === "overdue-unsubmitted")
    return (
      <span className="text-xs font-medium text-destructive">
        Overdue {formatDuration(state.overdueByMs)}
      </span>
    );
  if (state.kind === "submitted-on-time")
    return <span className="text-xs text-emerald-700">Submitted on time</span>;
  return (
    <span className="text-xs text-destructive">Submitted late</span>
  );
}