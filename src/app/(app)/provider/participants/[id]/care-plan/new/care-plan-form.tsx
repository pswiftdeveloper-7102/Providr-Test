"use client";

import Link from "next/link";
import { useActionState } from "react";

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
import { Textarea } from "@/components/ui/textarea";

import {
  createCarePlanAction,
  updateCarePlanAction,
  type CarePlanFormState,
} from "../actions";

const initial: CarePlanFormState = {};

export type CarePlanFormValues = {
  effectiveFrom: string | null;
  effectiveTo: string | null;
  summary: string | null;
  communicationPreferences: string | null;
  medicalConditions: string | null;
  allergies: string | null;
  risks: string | null;
  emergencyContacts: string | null;
  culturalConsiderations: string | null;
};

type Props = {
  participantId: string;
  cancelHref: string;
  /**
   * When provided, the form runs in edit mode against this plan ID and
   * pre-fills inputs from `values`. Omit both for create mode.
   */
  carePlanId?: string;
  values?: CarePlanFormValues;
};

function dateForInput(d: string | Date | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}`;
}

export function CarePlanForm({
  participantId,
  cancelHref,
  carePlanId,
  values,
}: Props) {
  const isEdit = !!carePlanId;
  const action = isEdit
    ? updateCarePlanAction.bind(null, carePlanId!)
    : createCarePlanAction.bind(null, participantId);
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction}>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Plan dates & summary</CardTitle>
            <CardDescription>
              The high-level frame — when it applies and what&apos;s going on.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="effectiveFrom">Effective from</Label>
                <Input
                  id="effectiveFrom"
                  name="effectiveFrom"
                  type="date"
                  defaultValue={dateForInput(values?.effectiveFrom)}
                  aria-invalid={!!state.fieldErrors?.effectiveFrom}
                />
                {state.fieldErrors?.effectiveFrom && (
                  <p className="text-xs text-destructive">
                    {state.fieldErrors.effectiveFrom}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="effectiveTo">Effective to</Label>
                <Input
                  id="effectiveTo"
                  name="effectiveTo"
                  type="date"
                  defaultValue={dateForInput(values?.effectiveTo)}
                  aria-invalid={!!state.fieldErrors?.effectiveTo}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="summary">Plan summary</Label>
              <Textarea
                id="summary"
                name="summary"
                rows={4}
                defaultValue={values?.summary ?? ""}
                placeholder="Brief overview — main supports, key worker, anything urgent…"
                aria-invalid={!!state.fieldErrors?.summary}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Context for support workers</CardTitle>
            <CardDescription>
              Everything a worker arriving for a shift needs to know.
              Support workers see these fields read-only.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <TextField
              name="communicationPreferences"
              label="Communication preferences"
              defaultValue={values?.communicationPreferences}
              placeholder="E.g. short sentences, allow processing time, use AAC device for choices."
            />
            <TextField
              name="medicalConditions"
              label="Medical conditions"
              defaultValue={values?.medicalConditions}
              placeholder="Diagnoses, current treatments, medication summary, GP details…"
            />
            <TextField
              name="allergies"
              label="Allergies"
              defaultValue={values?.allergies}
              placeholder="What to avoid, what the reaction looks like, where the EpiPen lives…"
              destructive
            />
            <TextField
              name="risks"
              label="Risks & risk assessments"
              defaultValue={values?.risks}
              placeholder="Falls, choking, behaviour of concern, escalation — and how to manage each."
            />
            <TextField
              name="emergencyContacts"
              label="Emergency contacts"
              defaultValue={values?.emergencyContacts}
              placeholder="Names, relationships, phone numbers, who to call in what order."
            />
            <TextField
              name="culturalConsiderations"
              label="Cultural considerations"
              defaultValue={values?.culturalConsiderations}
              placeholder="Language, faith, food, family practices that matter to this person."
            />
          </CardContent>
        </Card>

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
            {pending
              ? isEdit
                ? "Saving…"
                : "Creating…"
              : isEdit
                ? "Save changes"
                : "Create care plan"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function TextField({
  name,
  label,
  defaultValue,
  placeholder,
  destructive,
}: {
  name: string;
  label: string;
  defaultValue: string | null | undefined;
  placeholder: string;
  destructive?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
        {destructive && (
          <span className="ml-2 text-[10px] uppercase tracking-wider text-destructive">
            Highlighted to workers
          </span>
        )}
      </Label>
      <Textarea
        id={name}
        name={name}
        rows={3}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
      />
    </div>
  );
}