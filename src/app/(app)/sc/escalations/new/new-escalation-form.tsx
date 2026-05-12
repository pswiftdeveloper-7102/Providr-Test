"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BrandedSelectItem,
  BrandedSelectTrigger,
} from "@/components/branded-select";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import {
  createEscalationAction,
  type EscalationFormState,
} from "../actions";

const initial: EscalationFormState = {};

const TYPES = [
  { value: "PROVIDER_DROP", label: "Provider dropped the participant" },
  { value: "HOSPITAL", label: "Hospital admission" },
  { value: "REPORTABLE_INCIDENT", label: "Reportable incident across team" },
  { value: "FAMILY_ISSUE", label: "Family / informal support issue" },
  { value: "EMERGENCY_COVER", label: "Emergency cover needed" },
  { value: "PLAN_BREACH", label: "Plan breach (over-spend, wrong category)" },
  { value: "OTHER", label: "Other" },
] as const;

type EType = (typeof TYPES)[number]["value"];

export function NewEscalationForm({
  participants,
  defaultParticipantId,
  cancelHref,
}: {
  participants: { id: string; firstName: string; lastName: string }[];
  defaultParticipantId: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(
    createEscalationAction,
    initial
  );
  const [participantId, setParticipantId] = useState(defaultParticipantId);
  const [type, setType] = useState<EType | "">("");

  return (
    <form action={formAction}>
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>
            Mark the resolution later — for now just get it logged.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="participantId">
              Participant<span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Select
              name="participantId"
              value={participantId}
              onValueChange={(v) => setParticipantId(v ?? "")}
            >
              <BrandedSelectTrigger
                id="participantId"
                className="w-full"
                aria-invalid={!!state.fieldErrors?.participantId}
              >
                <SelectValue placeholder="Who's affected?" />
              </BrandedSelectTrigger>
              <SelectContent>
                {participants.map((p) => (
                  <BrandedSelectItem key={p.id} value={p.id}>
                    {p.firstName} {p.lastName}
                  </BrandedSelectItem>
                ))}
              </SelectContent>
            </Select>
            {state.fieldErrors?.participantId && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.participantId}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">
              Type<span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Select
              name="type"
              value={type}
              onValueChange={(v) => v && setType(v as EType)}
            >
              <BrandedSelectTrigger
                id="type"
                className="w-full"
                aria-invalid={!!state.fieldErrors?.type}
              >
                <SelectValue placeholder="What kind?" />
              </BrandedSelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <BrandedSelectItem key={t.value} value={t.value}>
                    {t.label}
                  </BrandedSelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              What happened?
              <span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              name="description"
              rows={4}
              placeholder="Who told you, what they said, what you did first."
              aria-invalid={!!state.fieldErrors?.description}
              required
            />
            {state.fieldErrors?.description && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.description}
              </p>
            )}
          </div>

          {state.error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" render={<Link href={cancelHref} />}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Log escalation"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}