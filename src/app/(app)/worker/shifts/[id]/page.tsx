import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Clock, FileText, MapPin } from "lucide-react";

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
import { resolveWorkerContext } from "@/lib/session";

import { ClockInOutPanel } from "./clock-in-out-panel";
import { ProgressNoteForm } from "./progress-note-form";

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  SCHEDULED: "outline",
  IN_PROGRESS: "default",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
};

export default async function WorkerShiftPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await resolveWorkerContext();

  const shift = await db.shift.findFirst({
    where: { id, workerId: context.worker.id },
    include: {
      participant: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          address: true,
          phone: true,
          carePlans: {
            where: { status: "ACTIVE" },
            select: {
              id: true,
              summary: true,
              communicationPreferences: true,
              medicalConditions: true,
              allergies: true,
              risks: true,
              emergencyContacts: true,
              culturalConsiderations: true,
              goals: {
                select: { id: true, title: true, description: true },
                orderBy: { createdAt: "asc" },
              },
            },
            take: 1,
          },
          behaviourSupportPlans: {
            where: { status: "ACTIVE" },
            select: {
              id: true,
              summary: true,
              triggers: true,
              deescalation: true,
              whatNotToDo: true,
            },
            take: 1,
          },
        },
      },
      progressNotes: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!shift) notFound();

  const carePlan = shift.participant.carePlans[0];
  const bsp = shift.participant.behaviourSupportPlans[0];

  // Surface the most recent handover note from a prior shift for this
  // participant so the worker reads what the last shift left behind
  // without hunting for it.
  const previousHandover = await db.progressNote.findFirst({
    where: {
      isHandover: true,
      shift: {
        participantId: shift.participant.id,
        orgId: context.worker.orgId,
        id: { not: shift.id },
        scheduledStart: { lt: shift.scheduledStart },
      },
    },
    orderBy: { createdAt: "desc" },
    include: {
      shift: {
        select: {
          scheduledStart: true,
          worker: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2"
        render={<Link href="/worker" />}
      >
        <ArrowLeft />
        Back to roster
      </Button>

      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_VARIANT[shift.status] ?? "outline"}>
            {shift.status.toLowerCase().replace("_", " ")}
          </Badge>
        </div>
        <h1 className="text-xl font-semibold tracking-tight">
          {shift.participant.firstName} {shift.participant.lastName}
        </h1>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          {format(shift.scheduledStart, "EEEE dd MMM · h:mm a")} —{" "}
          {format(shift.scheduledEnd, "h:mm a")}
        </div>
        {shift.participant.address && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {shift.participant.address}
          </div>
        )}
      </header>

      <ClockInOutPanel
        shiftId={shift.id}
        status={shift.status}
        actualStart={shift.actualStart}
        actualEnd={shift.actualEnd}
      />

      {previousHandover && shift.status !== "COMPLETED" && (
        <Card className="border-amber-200 bg-amber-50/40">
          <CardHeader>
            <CardTitle className="text-base">Previous handover</CardTitle>
            <CardDescription>
              From {previousHandover.shift.worker.firstName}{" "}
              {previousHandover.shift.worker.lastName} ·{" "}
              {format(
                previousHandover.shift.scheduledStart,
                "dd MMM, h:mm a"
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">
              {previousHandover.body}
            </p>
          </CardContent>
        </Card>
      )}

      {(carePlan || bsp) && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Need-to-knows</CardTitle>
            </div>
            <CardDescription>
              Read-only view of the current plans for this participant.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {carePlan?.summary && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Care plan summary
                </p>
                <p className="mt-1 whitespace-pre-wrap">{carePlan.summary}</p>
              </div>
            )}
            {carePlan?.communicationPreferences && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Communication preferences
                </p>
                <p className="mt-1 whitespace-pre-wrap">
                  {carePlan.communicationPreferences}
                </p>
              </div>
            )}
            {carePlan?.medicalConditions && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Medical conditions
                </p>
                <p className="mt-1 whitespace-pre-wrap">
                  {carePlan.medicalConditions}
                </p>
              </div>
            )}
            {carePlan?.allergies && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Allergies
                </p>
                <p className="mt-1 whitespace-pre-wrap">{carePlan.allergies}</p>
              </div>
            )}
            {carePlan?.risks && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Risks
                </p>
                <p className="mt-1 whitespace-pre-wrap">{carePlan.risks}</p>
              </div>
            )}
            {carePlan?.emergencyContacts && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Emergency contacts
                </p>
                <p className="mt-1 whitespace-pre-wrap">
                  {carePlan.emergencyContacts}
                </p>
              </div>
            )}
            {carePlan?.culturalConsiderations && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Cultural considerations
                </p>
                <p className="mt-1 whitespace-pre-wrap">
                  {carePlan.culturalConsiderations}
                </p>
              </div>
            )}
            {carePlan && carePlan.goals.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Goals on this care plan
                </p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {carePlan.goals.map((g) => (
                    <li key={g.id}>{g.title}</li>
                  ))}
                </ul>
              </div>
            )}
            {bsp?.triggers && (
              <>
                <Separator />
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    BSP triggers
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{bsp.triggers}</p>
                </div>
              </>
            )}
            {bsp?.deescalation && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  De-escalation
                </p>
                <p className="mt-1 whitespace-pre-wrap">{bsp.deescalation}</p>
              </div>
            )}
            {bsp?.whatNotToDo && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  What not to do
                </p>
                <p className="mt-1 whitespace-pre-wrap">{bsp.whatNotToDo}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Progress notes</CardTitle>
          <CardDescription>
            Capture what happened. You can dictate using your phone&apos;s mic.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ProgressNoteForm shiftId={shift.id} />
          {shift.progressNotes.length > 0 && (
            <ul className="space-y-2">
              {shift.progressNotes.map((n) => (
                <li
                  key={n.id}
                  className="rounded-md border bg-muted/30 px-3 py-2 text-sm"
                >
                  <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <span>{format(n.createdAt, "dd MMM h:mm a")}</span>
                    <div className="flex items-center gap-1">
                      {n.isHandover && (
                        <Badge variant="outline" className="text-[10px]">
                          handover
                        </Badge>
                      )}
                      {n.inputMethod === "VOICE" && (
                        <Badge variant="outline" className="text-[10px]">
                          voice
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap">{n.body}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}