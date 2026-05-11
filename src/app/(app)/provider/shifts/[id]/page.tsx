import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ClipboardList, Pill } from "lucide-react";
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
    },
  });
  if (!shift) notFound();

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
            {format(shift.scheduledStart, "EEE d MMM yyyy")} ·{" "}
            {format(shift.scheduledStart, "h:mm a")} –{" "}
            {format(shift.scheduledEnd, "h:mm a")}
          </p>
        </div>
        <Badge variant={STATUS_VARIANT[shift.status]}>
          {STATUS_LABEL[shift.status]}
        </Badge>
      </header>

      <ClockControls
        shiftId={shift.id}
        status={shift.status}
        actualStart={shift.actualStart}
        actualEnd={shift.actualEnd}
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
                  className="rounded-md border bg-muted/30 px-3 py-2"
                >
                  <div className="text-xs text-muted-foreground">
                    {format(note.createdAt, "h:mm a")}
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
            Log every dose given during the shift. PRN and refusal tracking
            will come in a later iteration.
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
    </div>
  );
}