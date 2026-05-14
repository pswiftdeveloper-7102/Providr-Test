"use client";

import { useActionState, useState } from "react";

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
import { Textarea } from "@/components/ui/textarea";
import { FormError } from "@/components/form-error";

import {
  createQuickIncidentAction,
  type CreateIncidentState,
} from "../../actions";

const initial: CreateIncidentState = {};

const TYPES = [
  { value: "INJURY", label: "Injury" },
  { value: "ABUSE", label: "Abuse" },
  { value: "NEGLECT", label: "Neglect" },
  { value: "UNLAWFUL_CONTACT", label: "Unlawful contact" },
  { value: "UNAUTHORISED_RESTRICTIVE_PRACTICE", label: "Unauthorised restrictive practice" },
  { value: "PROPERTY_DAMAGE", label: "Property damage" },
  { value: "MEDICATION_ERROR", label: "Medication error" },
  { value: "MISSING_PERSON", label: "Missing person" },
  { value: "DEATH", label: "Death" },
  { value: "OTHER", label: "Other" },
] as const;

const SEVERITIES = [
  { value: "MINOR", label: "Minor" },
  { value: "MODERATE", label: "Moderate" },
  { value: "SERIOUS", label: "Serious" },
  { value: "REPORTABLE", label: "Reportable" },
] as const;

function nowLocalIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Participant = { id: string; name: string };

export function QuickReportForm({ participants }: { participants: Participant[] }) {
  const [state, dispatch, pending] = useActionState(
    createQuickIncidentAction,
    initial
  );
  const [participantId, setParticipantId] = useState("");
  const [incidentType, setIncidentType] = useState("");
  const [severity, setSeverity] = useState("");
  const [initialDateTime] = useState(() => nowLocalIso());

  return (
    <form action={dispatch}>
      <Card>
        <CardHeader>
          <CardTitle>Quick Incident Report</CardTitle>
          <CardDescription>
            Fill in the essentials. This saves as a draft for a supervisor to complete.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="participantId">Participant (optional)</Label>
            <Select
              name="participantId"
              value={participantId}
              onValueChange={(v) => setParticipantId(v ?? "")}
            >
              <SelectTrigger id="participantId" className="w-full">
                <SelectValue placeholder="Select participant">
                  {participants.find((p) => p.id === participantId)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {participants.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="occurredAt">Date &amp; Time</Label>
            <Input
              id="occurredAt"
              name="occurredAt"
              type="datetime-local"
              defaultValue={initialDateTime}
              required
              aria-invalid={!!state.fieldErrors?.occurredAt}
            />
            {state.fieldErrors?.occurredAt && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.occurredAt}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              name="location"
              placeholder="e.g. Participant's home, Community centre"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="incidentType">Incident Type</Label>
              <Select
                name="incidentType"
                value={incidentType}
                onValueChange={(v) => setIncidentType(v ?? "")}
              >
                <SelectTrigger id="incidentType" className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="severity">Severity</Label>
              <Select
                name="severity"
                value={severity}
                onValueChange={(v) => setSeverity(v ?? "")}
              >
                <SelectTrigger id="severity" className="w-full">
                  <SelectValue placeholder="Select severity" />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">What happened?</Label>
            <Textarea
              id="description"
              name="description"
              rows={4}
              placeholder="Briefly describe what happened…"
              required
              aria-invalid={!!state.fieldErrors?.description}
            />
            {state.fieldErrors?.description && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.description}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="immediateActions">
              What did you do immediately? (optional)
            </Label>
            <Textarea
              id="immediateActions"
              name="immediateActions"
              rows={3}
              placeholder="e.g. Applied first aid, called supervisor…"
            />
          </div>

          <FormError message={state.error} />

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Saving…" : "Save Draft"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}