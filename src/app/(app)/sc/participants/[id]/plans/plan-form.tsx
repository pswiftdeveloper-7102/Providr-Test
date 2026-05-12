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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { dollarsToCents, formatCents } from "@/lib/utils";

import {
  createSCPlanAction,
  updateSCPlanAction,
  type PlanFormState,
} from "./actions";

const initial: PlanFormState = {};

export type PlanFormValues = {
  ndisPlanNumber: string;
  startDate: string;
  endDate: string;
  coreDollars: string;
  capacityDollars: string;
  capitalDollars: string;
  planFileName: string | null;
  spentByCategory?: { CORE: number; CAPACITY: number; CAPITAL: number };
};

export function PlanForm({
  participantId,
  cancelHref,
  planId,
  values,
}: {
  participantId: string;
  cancelHref: string;
  planId?: string;
  values?: PlanFormValues;
}) {
  const isEdit = !!planId;
  const action = isEdit
    ? updateSCPlanAction.bind(null, planId!)
    : createSCPlanAction.bind(null, participantId);
  const [state, formAction, pending] = useActionState(action, initial);

  const [coreDollars, setCoreDollars] = useState(values?.coreDollars ?? "");
  const [capacityDollars, setCapacityDollars] = useState(
    values?.capacityDollars ?? ""
  );
  const [capitalDollars, setCapitalDollars] = useState(
    values?.capitalDollars ?? ""
  );

  const totalCents =
    dollarsToCents(coreDollars) +
    dollarsToCents(capacityDollars) +
    dollarsToCents(capitalDollars);

  const spent = values?.spentByCategory;

  return (
    <form action={formAction} encType="multipart/form-data" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Plan dates</CardTitle>
          <CardDescription>
            Enter what&apos;s on the participant&apos;s NDIS plan document.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ndisPlanNumber">NDIS plan number</Label>
            <Input
              id="ndisPlanNumber"
              name="ndisPlanNumber"
              defaultValue={values?.ndisPlanNumber ?? ""}
              placeholder="e.g. PLAN-2026-AB123"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate">
                Start date<span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                defaultValue={values?.startDate ?? ""}
                required
                aria-invalid={!!state.fieldErrors?.startDate}
              />
              {state.fieldErrors?.startDate && (
                <p className="text-xs text-destructive">
                  {state.fieldErrors.startDate}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">
                End date<span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                defaultValue={values?.endDate ?? ""}
                required
                aria-invalid={!!state.fieldErrors?.endDate}
              />
              {state.fieldErrors?.endDate && (
                <p className="text-xs text-destructive">
                  {state.fieldErrors.endDate}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Budget allocation</CardTitle>
          <CardDescription>
            Three buckets — Core, Capacity, Capital — totalling the plan.
            {isEdit &&
              " Reallocate as the year progresses, but you can't reduce a bucket below what's already been spent against it."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <BucketField
            id="coreDollars"
            label="Core supports"
            help="Daily life — workers, transport, consumables"
            value={coreDollars}
            onChange={setCoreDollars}
            spent={spent?.CORE}
            error={state.fieldErrors?.coreDollars}
          />
          <BucketField
            id="capacityDollars"
            label="Capacity building"
            help="Therapy and skills"
            value={capacityDollars}
            onChange={setCapacityDollars}
            spent={spent?.CAPACITY}
            error={state.fieldErrors?.capacityDollars}
          />
          <BucketField
            id="capitalDollars"
            label="Capital"
            help="One-off purchases — equipment, mods"
            value={capitalDollars}
            onChange={setCapitalDollars}
            spent={spent?.CAPITAL}
            error={state.fieldErrors?.capitalDollars}
          />
          <Separator />
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="text-muted-foreground">Plan total</span>
            <span className="text-base font-semibold">
              {formatCents(totalCents)}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plan document</CardTitle>
          <CardDescription>
            Optional — attach the participant&apos;s NDIS plan PDF for your
            records (10 MB max).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {values?.planFileName && (
            <p className="text-sm text-muted-foreground">
              Currently attached:{" "}
              <span className="font-medium text-foreground">
                {values.planFileName}
              </span>
              . Uploading a new file replaces it.
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="planFile">Plan PDF (optional)</Label>
            <Input
              id="planFile"
              name="planFile"
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
            />
          </div>
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
              ? "Save plan"
              : "Create plan"}
        </Button>
      </div>
    </form>
  );
}

function BucketField({
  id,
  label,
  help,
  value,
  onChange,
  spent,
  error,
}: {
  id: string;
  label: string;
  help: string;
  value: string;
  onChange: (v: string) => void;
  spent?: number;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {spent !== undefined && spent > 0 && (
          <span className="text-xs text-muted-foreground">
            {formatCents(spent)} already spent
          </span>
        )}
      </div>
      <Input
        id={id}
        name={id}
        type="number"
        step="0.01"
        min="0"
        placeholder="0.00"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
      />
      <p className="text-xs text-muted-foreground">{help}</p>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}