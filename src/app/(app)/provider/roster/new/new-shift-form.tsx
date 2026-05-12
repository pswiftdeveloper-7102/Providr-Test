"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { AlertTriangle, ShieldAlert } from "lucide-react";

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
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import { FormError } from "@/components/form-error";
import { DateField } from "@/components/date-field";
import { CERT_LABEL, type CertStatus } from "@/lib/certificates";

import { createShiftAction, type CreateShiftState } from "./actions";

type WorkerOption = {
  id: string;
  name: string;
  ndisStatus: CertStatus;
  firstAidStatus: CertStatus;
  ndisExpiry: string | null;
};

type ParticipantOption = {
  id: string;
  name: string;
  pronouns: string | null;
  coiApplies: boolean;
};

type Props = {
  workers: WorkerOption[];
  participants: ParticipantOption[];
};

const initialState: CreateShiftState = {};

function formatExpiryDate(iso: string | null): string {
  if (!iso) return "an unknown date";
  const d = new Date(iso);
  return d.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function NewShiftForm({ workers, participants }: Props) {
  const [state, formAction, pending] = useActionState(
    createShiftAction,
    initialState
  );

  const [workerId, setWorkerId] = useState("");
  const [participantId, setParticipantId] = useState("");
  const [coiAcknowledged, setCoiAcknowledged] = useState(false);

  const selectedWorker = workers.find((w) => w.id === workerId);
  const ndisExpired = selectedWorker?.ndisStatus === "expired";
  const ndisExpiring = selectedWorker?.ndisStatus === "expiring";

  const selectedParticipant = participants.find((p) => p.id === participantId);
  const coiApplies = !!selectedParticipant?.coiApplies;

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
                    <SelectItem key={w.id} value={w.id}>
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
            {selectedWorker && ndisExpiring && (
              <p className="text-xs text-amber-700">
                NDIS Worker Check is expiring soon. Renew before the next
                roster cycle.
              </p>
            )}
          </div>

          {selectedWorker && ndisExpired && (
            <Alert variant="destructive">
              <ShieldAlert />
              <AlertTitle>
                NDIS Worker Screening Check expired on{" "}
                {formatExpiryDate(selectedWorker.ndisExpiry)}
              </AlertTitle>
              <AlertDescription className="space-y-2">
                <p>
                  Proceeding without a current check is a compliance breach.
                  If you have a documented reason to continue (e.g. renewal
                  in progress, urgent care need), record it below — this
                  becomes part of the shift&apos;s audit trail.
                </p>
                <div className="space-y-1">
                  <Label htmlFor="expiredCheckOverride" className="text-xs">
                    Reason to proceed
                    <span className="ml-0.5 text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="expiredCheckOverride"
                    name="expiredCheckOverride"
                    rows={2}
                    placeholder="e.g. Renewal lodged 10/05/2026, awaiting clearance. Continuity of care for participant essential."
                    aria-invalid={
                      !!state.fieldErrors?.expiredCheckOverride
                    }
                  />
                  {state.fieldErrors?.expiredCheckOverride && (
                    <p className="text-xs text-destructive">
                      {state.fieldErrors.expiredCheckOverride}
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

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
                  {selectedParticipant?.name}
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
                        <div className="flex items-center gap-2">
                          {p.coiApplies && (
                            <Badge
                              variant="outline"
                              className="border-amber-300 bg-amber-50 text-amber-900"
                            >
                              CoI
                            </Badge>
                          )}
                          {p.pronouns && (
                            <span className="text-xs text-muted-foreground">
                              {p.pronouns}
                            </span>
                          )}
                        </div>
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

          {coiApplies && (
            <Alert>
              <AlertTriangle />
              <AlertTitle>Conflict of interest disclosure required</AlertTitle>
              <AlertDescription className="space-y-3">
                <p>
                  This organisation also provides Support Coordination to{" "}
                  {selectedParticipant?.name}. Under the NDIS Code of Conduct,
                  the participant must be informed when the same organisation
                  both coordinates and delivers their care, and offered
                  alternative providers.
                </p>
                <label className="flex items-start gap-2 text-sm">
                  <Checkbox
                    name="coiAcknowledged"
                    value="on"
                    checked={coiAcknowledged}
                    onCheckedChange={(v) => setCoiAcknowledged(!!v)}
                    aria-invalid={!!state.fieldErrors?.coiAcknowledged}
                  />
                  <span>
                    I confirm the participant has been told this org both
                    coordinates and delivers their care, has been offered
                    alternatives, and has agreed to this shift.
                  </span>
                </label>
                {state.fieldErrors?.coiAcknowledged && (
                  <p className="text-xs text-destructive">
                    {state.fieldErrors.coiAcknowledged}
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}

          <Separator />

          <DateField name="date" label="Date" required defaultValue={todayIso} error={state.fieldErrors?.date} />

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
            <Button type="submit" disabled={pending}>
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