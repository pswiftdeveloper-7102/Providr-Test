import { notFound } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ClipboardList,
  HeartPulse,
  HandHelping,
  Hand,
  Pill,
  ShieldAlert,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

import { ClockControls } from "./clock-controls";
import { AddProgressNoteForm } from "./add-progress-note";
import { AddMarForm } from "./add-mar";
import { QuickLogIncidentForm } from "./quick-log-incident";
import { LogRestraintForm } from "./log-restraint";

const STATUS_VARIANT: Record<
  "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED",
  "default" | "secondary" | "outline" | "destructive"
> = {
  SCHEDULED: "secondary",
  IN_PROGRESS: "default",
  COMPLETED: "outline",
  CANCELLED: "destructive",
};

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const MAR_STATUS_LABEL: Record<string, string> = {
  GIVEN: "Given",
  REFUSED: "Refused",
  UNAVAILABLE: "Unavailable",
  OUT_OF_STOCK: "Out of stock",
  FORGOTTEN: "Missed",
  CLINICAL_HOLD: "Held",
  OTHER: "Other",
};

export default async function ShiftDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await resolvePortalContext("provider");

  const shift = await db.shift.findFirst({
    where: { id, orgId: context.activeOrg.id },
    include: {
      participant: { select: { id: true, firstName: true, lastName: true } },
      worker: { select: { id: true, firstName: true, lastName: true } },
      progressNotes: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      medicationRecords: {
        orderBy: { givenAt: "desc" },
        take: 50,
      },
      incidents: {
        orderBy: { occurredAt: "desc" },
        take: 20,
      },
    },
  });
  if (!shift) notFound();

  const restraints = await db.restraintRecord.findMany({
    where: { shiftId: shift.id, orgId: context.activeOrg.id },
    orderBy: { usedAt: "desc" },
  });

  // Q4 paperwork-friction #3: PRN doses sometimes get logged without their
  // outcome (because the medication hasn't taken effect yet). Surface a
  // gentle reminder while the shift is still in progress.
  const prnPendingOutcome = shift.medicationRecords.filter(
    (m) => m.isPrn && m.status === "GIVEN" && !m.prnOutcome
  );

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        render={<Link href="/provider/shifts" />}
      >
        <ArrowLeft />
        Back to shifts
      </Button>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Shift
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {shift.worker.firstName} {shift.worker.lastName}
            <span className="mx-2 text-muted-foreground">→</span>
            {shift.participant.firstName} {shift.participant.lastName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {format(shift.scheduledStart, "EEE, dd/MM/yyyy")} ·{" "}
            {format(shift.scheduledStart, "h:mm a")} –{" "}
            {format(shift.scheduledEnd, "h:mm a")}
          </p>
        </div>
        <Badge variant={STATUS_VARIANT[shift.status]}>
          {STATUS_LABEL[shift.status]}
        </Badge>
      </header>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          render={
            <Link href={`/provider/participants/${shift.participant.id}`} />
          }
        >
          <HeartPulse />
          View care plan & BSP
        </Button>
      </div>

      {shift.status === "IN_PROGRESS" && prnPendingOutcome.length > 0 && (
        <Alert>
          <AlertTriangle />
          <AlertTitle>
            {prnPendingOutcome.length} PRN dose
            {prnPendingOutcome.length === 1 ? "" : "s"} without an outcome
          </AlertTitle>
          <AlertDescription>
            {prnPendingOutcome
              .map((m) => `${m.medication}${m.dose ? ` ${m.dose}` : ""}`)
              .join(", ")}
            . Outcome can be added later — but easier while you remember.
          </AlertDescription>
        </Alert>
      )}

      <ClockControls
        shiftId={shift.id}
        status={shift.status}
        actualStart={shift.actualStart}
        actualEnd={shift.actualEnd}
        progressNoteCount={shift.progressNotes.length}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            <CardTitle>Progress notes</CardTitle>
          </div>
          <CardDescription>
            Capture what happened during the shift — mid-shift updates and
            the end-of-shift summary all live here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AddProgressNoteForm shiftId={shift.id} />

          <Separator />

          {shift.progressNotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No notes yet. The first one is usually the morning routine
              recap.
            </p>
          ) : (
            <ul className="space-y-3">
              {shift.progressNotes.map((note) => (
                <li
                  key={note.id}
                  className={
                    note.isHandover
                      ? "rounded-md border border-primary/30 bg-primary/5 px-3 py-2"
                      : "rounded-md border bg-muted/30 px-3 py-2"
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-muted-foreground">
                      {format(note.createdAt, "h:mm a")}
                    </div>
                    {note.isHandover && (
                      <Badge variant="default" className="text-[10px] gap-1">
                        <HandHelping className="h-3 w-3" />
                        Handover
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm whitespace-pre-wrap">
                    {note.body}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Pill className="h-4 w-4 text-muted-foreground" />
            <CardTitle>Medication administered (MAR)</CardTitle>
          </div>
          <CardDescription>
            Every administration attempt — given, refused, missed. Tag PRN
            doses; the outcome can be filled in later.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AddMarForm shiftId={shift.id} />

          <Separator />

          {shift.medicationRecords.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No doses logged yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {shift.medicationRecords.map((m) => (
                <li
                  key={m.id}
                  className="rounded-md border bg-muted/30 px-3 py-2"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-medium">
                      {m.medication}
                      {m.dose && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {m.dose}
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(m.givenAt, "h:mm a")}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {m.status !== "GIVEN" && (
                      <Badge variant="destructive" className="text-[10px]">
                        {MAR_STATUS_LABEL[m.status]}
                      </Badge>
                    )}
                    {m.isPrn && (
                      <Badge variant="secondary" className="text-[10px]">
                        PRN
                      </Badge>
                    )}
                    {m.isPrn && m.status === "GIVEN" && !m.prnOutcome && (
                      <Badge variant="outline" className="text-[10px]">
                        Outcome pending
                      </Badge>
                    )}
                  </div>
                  {m.isPrn && m.prnReason && (
                    <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">
                      <span className="font-medium">Why:</span> {m.prnReason}
                    </p>
                  )}
                  {m.isPrn && m.prnOutcome && (
                    <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">
                      <span className="font-medium">Outcome:</span>{" "}
                      {m.prnOutcome}
                    </p>
                  )}
                  {m.missedReason && (
                    <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">
                      {m.missedReason}
                    </p>
                  )}
                  {m.notes && (
                    <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">
                      {m.notes}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
            <CardTitle>Incidents this shift</CardTitle>
          </div>
          <CardDescription>
            Quick-log minor and moderate events. Serious or reportable ones
            go through the full form.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <QuickLogIncidentForm
            shiftId={shift.id}
            participantId={shift.participant.id}
          />

          <Separator />

          {shift.incidents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing logged from this shift.
            </p>
          ) : (
            <ul className="space-y-2">
              {shift.incidents.map((i) => (
                <li
                  key={i.id}
                  className="rounded-md border bg-muted/30 px-3 py-2"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <Link
                      href={`/provider/incidents/${i.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {i.description.length > 80
                        ? `${i.description.slice(0, 80)}…`
                        : i.description}
                    </Link>
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant={
                          i.severity === "REPORTABLE" ||
                          i.severity === "SERIOUS"
                            ? "destructive"
                            : i.severity === "MODERATE"
                              ? "secondary"
                              : "outline"
                        }
                        className="text-[10px]"
                      >
                        {i.severity.toLowerCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(i.occurredAt, "h:mm a")}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Hand className="h-4 w-4 text-muted-foreground" />
            <CardTitle>Restraint use</CardTitle>
          </div>
          <CardDescription>
            Every use must be logged — NDIS requires the record for audit
            and review by the behaviour support practitioner.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <LogRestraintForm shiftId={shift.id} />

          {restraints.length > 0 && (
            <>
              <Separator />
              <ul className="space-y-2">
                {restraints.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-md border bg-muted/30 px-3 py-2"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="text-[10px]">
                          {r.type.toLowerCase()}
                        </Badge>
                        {r.durationMinutes && (
                          <span className="text-xs text-muted-foreground">
                            {r.durationMinutes} min
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(r.usedAt, "h:mm a")}
                      </span>
                    </div>
                    <p className="mt-1 text-sm whitespace-pre-wrap">
                      {r.reason}
                    </p>
                    {r.outcome && (
                      <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">
                        <span className="font-medium">Outcome:</span>{" "}
                        {r.outcome}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}