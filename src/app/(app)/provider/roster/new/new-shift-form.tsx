"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { FormError } from "@/components/form-error";
import { CERT_LABEL, type CertStatus } from "@/lib/certificates";

import { createShiftAction, type CreateShiftState } from "./actions";

type WorkerOption = {
  id: string;
  name: string;
  ndisStatus: CertStatus;
  firstAidStatus: CertStatus;
};

type ParticipantOption = {
  id: string;
  name: string;
  pronouns: string | null;
};

type Props = {
  workers: WorkerOption[];
  participants: ParticipantOption[];
};

const initialState: CreateShiftState = {};

export function NewShiftForm({ workers, participants }: Props) {
  const [state, formAction, pending] = useActionState(
    createShiftAction,
    initialState
  );

  const [workerId, setWorkerId] = useState("");
  const [participantId, setParticipantId] = useState("");

  const selectedWorker = workers.find((w) => w.id === workerId);
  const ndisExpired = selectedWorker?.ndisStatus === "expired";
  const ndisExpiring = selectedWorker?.ndisStatus === "expiring";

  // Default to today's date for the date input.
  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction}>
      <Card>
        <CardHeader>
          <CardTitle>Shift details</CardTitle>
          <CardDescription>
            All fields are required.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="workerId">
              Worker<span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Select
              name="workerId"
              value={workerId}
              onValueChange={(v) => setWorkerId(v ?? "")}
            >
              <SelectTrigger
                id="workerId"
                className="w-full"
                aria-invalid={!!state.fieldErrors?.workerId}
              >
                <SelectValue placeholder="Pick a worker">
                  {selectedWorker?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {workers.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    No workers — add one first.
                  </div>
                ) : (
                  workers.map((w) => (
                    <SelectItem
                      key={w.id}
                      value={w.id}
                      disabled={w.ndisStatus === "expired"}
                    >
                      <div className="flex flex-1 items-center justify-between gap-3">
                        <span>{w.name}</span>
                        <CertChip status={w.ndisStatus} />
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {state.fieldErrors?.workerId && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.workerId}
              </p>
            )}
            {selectedWorker && ndisExpired && (
              <p className="text-xs text-destructive">
                NDIS Worker Check is expired — this worker can&apos;t be
                rostered until the check is renewed.
              </p>
            )}
            {selectedWorker && ndisExpiring && (
              <p className="text-xs text-amber-700">
                NDIS Worker Check is expiring soon. Renew before the next
                roster cycle.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="participantId">
              Participant<span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Select
              name="participantId"
              value={participantId}
              onValueChange={(v) => setParticipantId(v ?? "")}
            >
              <SelectTrigger
                id="participantId"
                className="w-full"
                aria-invalid={!!state.fieldErrors?.participantId}
              >
                <SelectValue placeholder="Pick a participant">
                  {participants.find((p) => p.id === participantId)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {participants.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    No participants — add one first.
                  </div>
                ) : (
                  participants.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex flex-1 items-center justify-between gap-3">
                        <span>{p.name}</span>
                        {p.pronouns && (
                          <span className="text-xs text-muted-foreground">
                            {p.pronouns}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {state.fieldErrors?.participantId && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.participantId}
              </p>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="date">
              Date<span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Input
              id="date"
              name="date"
              type="date"
              required
              defaultValue={todayIso}
              aria-invalid={!!state.fieldErrors?.date}
            />
            {state.fieldErrors?.date && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.date}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startTime">
                Start time<span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Input
                id="startTime"
                name="startTime"
                type="time"
                required
                defaultValue="09:00"
                aria-invalid={!!state.fieldErrors?.startTime}
              />
              {state.fieldErrors?.startTime && (
                <p className="text-xs text-destructive">
                  {state.fieldErrors.startTime}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">
                End time<span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Input
                id="endTime"
                name="endTime"
                type="time"
                required
                defaultValue="17:00"
                aria-invalid={!!state.fieldErrors?.endTime}
              />
              {state.fieldErrors?.endTime && (
                <p className="text-xs text-destructive">
                  {state.fieldErrors.endTime}
                </p>
              )}
            </div>
          </div>

          <FormError message={state.error} />

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" render={<Link href="/provider/roster" />}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || ndisExpired}>
              {pending ? "Creating…" : "Create shift"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

function CertChip({ status }: { status: CertStatus }) {
  if (status === "expired") {
    return <Badge variant="destructive">{CERT_LABEL[status]}</Badge>;
  }
  if (status === "expiring") {
    return (
      <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">
        {CERT_LABEL[status]}
      </Badge>
    );
  }
  if (status === "active") {
    return <Badge variant="secondary">{CERT_LABEL[status]}</Badge>;
  }
  return <Badge variant="outline">{CERT_LABEL[status]}</Badge>;
}