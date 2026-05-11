"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Textarea } from "@/components/ui/textarea";

import { createIncidentAction } from "../actions";
import type { CreateIncidentState } from "../actions";

type Severity = "MINOR" | "MODERATE" | "SERIOUS" | "REPORTABLE";

const SEVERITY_OPTIONS: Array<{ value: Severity; label: string; hint: string }> = [
  { value: "MINOR", label: "Minor", hint: "No harm or risk of harm." },
  {
    value: "MODERATE",
    label: "Moderate",
    hint: "Caused or could cause minor harm.",
  },
  {
    value: "SERIOUS",
    label: "Serious",
    hint: "Caused or could cause significant harm.",
  },
  {
    value: "REPORTABLE",
    label: "Reportable",
    hint:
      "Meets NDIS reportable criteria. 24-hour submission clock starts when filed.",
  },
];

type ParticipantOption = { id: string; name: string };
type ShiftOption = { id: string; label: string; dateLabel: string };

const initial: CreateIncidentState = {};

function nowLocalIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function NewIncidentForm({
  participants,
  recentShifts,
}: {
  participants: ParticipantOption[];
  recentShifts: ShiftOption[];
}) {
  const [state, formAction, pending] = useActionState(
    createIncidentAction,
    initial
  );
  const [participantId, setParticipantId] = useState("");
  const [shiftId, setShiftId] = useState("");
  const [severity, setSeverity] = useState<Severity | "">("");

  const isReportable = severity === "REPORTABLE";

  return (
    <form action={formAction}>
      <Card>
        <CardHeader>
          <CardTitle>Incident details</CardTitle>
          <CardDescription>
            Capture what happened, who was involved, and what was done. The
            description must be at least 10 characters.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
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
                      {p.name}
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

          <div className="space-y-2">
            <Label htmlFor="shiftId">Linked shift (optional)</Label>
            <Select
              name="shiftId"
              value={shiftId}
              onValueChange={(v) => setShiftId(v ?? "")}
            >
              <SelectTrigger
                id="shiftId"
                className="w-full"
                aria-invalid={!!state.fieldErrors?.shiftId}
              >
                <SelectValue placeholder="None">
                  {recentShifts.find((s) => s.id === shiftId)?.label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {recentShifts.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    No recent shifts.
                  </div>
                ) : (
                  recentShifts.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex flex-1 items-center justify-between gap-3">
                        <span className="truncate">{s.label}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {s.dateLabel}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Linking to a shift gives investigation full context (worker on
              duty, time window).
            </p>
            {state.fieldErrors?.shiftId && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.shiftId}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="occurredAt">
              When it happened
              <span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Input
              id="occurredAt"
              name="occurredAt"
              type="datetime-local"
              defaultValue={nowLocalIso()}
              aria-invalid={!!state.fieldErrors?.occurredAt}
              required
            />
            {state.fieldErrors?.occurredAt && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.occurredAt}
              </p>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="severity">
              Severity<span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Select
              name="severity"
              value={severity}
              onValueChange={(v) =>
                setSeverity((v as Severity | null) ?? "")
              }
            >
              <SelectTrigger
                id="severity"
                className="w-full"
                aria-invalid={!!state.fieldErrors?.severity}
              >
                <SelectValue placeholder="Pick a severity">
                  {SEVERITY_OPTIONS.find((s) => s.value === severity)?.label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {SEVERITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{opt.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {opt.hint}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {state.fieldErrors?.severity && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.severity}
              </p>
            )}
          </div>

          {isReportable && (
            <Alert variant="destructive">
              <AlertTitle>NDIS 24-hour clock</AlertTitle>
              <AlertDescription>
                Filing as Reportable starts the 24-hour submission clock to
                the NDIS Quality and Safeguards Commission. You can mark it
                as submitted once you&apos;ve filed the formal notification.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">
              What happened<span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              name="description"
              rows={4}
              placeholder="Plain English. Who was present, what occurred, any injuries."
              aria-invalid={!!state.fieldErrors?.description}
              required
            />
            {state.fieldErrors?.description && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.description}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="immediateActions">Immediate actions taken</Label>
            <Textarea
              id="immediateActions"
              name="immediateActions"
              rows={3}
              placeholder="First aid given, manager notified, family contacted, etc."
              aria-invalid={!!state.fieldErrors?.immediateActions}
            />
            {state.fieldErrors?.immediateActions && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.immediateActions}
              </p>
            )}
          </div>

          {state.error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              render={<Link href="/provider/incidents" />}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Filing…" : "File incident"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}