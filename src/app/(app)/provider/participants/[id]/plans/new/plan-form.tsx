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
import { FormError } from "@/components/form-error";
import { DateField } from "@/components/date-field";
import { dollarsToCents, formatCents } from "@/lib/utils";

import { createPlanAction, type CreatePlanState } from "./actions";

const initialState: CreatePlanState = {};

export type PlanFormPrefill = {
  ndisPlanNumber: string | null;
  startDate: string | null;
  endDate: string | null;
  coreDollars: number | null;
  capacityDollars: number | null;
  capitalDollars: number | null;
};

type Props = {
  participantId: string;
  cancelHref: string;
  prefill?: PlanFormPrefill;
  planFileKey?: string | null;
  planFileName?: string | null;
};

function toMoneyStr(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "";
  return String(v);
}

export function PlanForm({
  participantId,
  cancelHref,
  prefill,
  planFileKey,
  planFileName,
}: Props) {
  const [state, formAction, pending] = useActionState(
    createPlanAction.bind(null, participantId),
    initialState
  );

  const [coreDollars, setCoreDollars] = useState(
    toMoneyStr(prefill?.coreDollars)
  );
  const [capacityDollars, setCapacityDollars] = useState(
    toMoneyStr(prefill?.capacityDollars)
  );
  const [capitalDollars, setCapitalDollars] = useState(
    toMoneyStr(prefill?.capitalDollars)
  );

  const totalCents =
    dollarsToCents(coreDollars) +
    dollarsToCents(capacityDollars) +
    dollarsToCents(capitalDollars);

  return (
    <form action={formAction} className="space-y-6">
      {planFileKey && (
        <>
          <input type="hidden" name="planFileKey" value={planFileKey} />
          <input
            type="hidden"
            name="planFileName"
            value={planFileName ?? ""}
          />
        </>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Plan dates</CardTitle>
          <CardDescription>
            Most NDIS plans run for a single year, but enter whatever is on
            their plan document.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ndisPlanNumber">NDIS plan number</Label>
            <Input
              id="ndisPlanNumber"
              name="ndisPlanNumber"
              placeholder="e.g. PLAN-2026-AB123"
              defaultValue={prefill?.ndisPlanNumber ?? ""}
              aria-invalid={!!state.fieldErrors?.ndisPlanNumber}
            />
            {state.fieldErrors?.ndisPlanNumber && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.ndisPlanNumber}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <DateField
              name="startDate"
              label="Start date"
              required
              defaultValue={prefill?.startDate ?? undefined}
              error={state.fieldErrors?.startDate}
            />
            <DateField
              name="endDate"
              label="End date"
              required
              defaultValue={prefill?.endDate ?? undefined}
              error={state.fieldErrors?.endDate}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Three buckets</CardTitle>
          <CardDescription>
            Different rules per bucket. Total auto-calculates as you type.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <BucketField
            id="coreDollars"
            label="Core supports"
            hint="Daily life — workers, transport, consumables"
            value={coreDollars}
            onChange={setCoreDollars}
          />
          <BucketField
            id="capacityDollars"
            label="Capacity building"
            hint="Therapy, skills, mental health"
            value={capacityDollars}
            onChange={setCapacityDollars}
          />
          <BucketField
            id="capitalDollars"
            label="Capital"
            hint="One-off purchases — equipment, modifications"
            value={capitalDollars}
            onChange={setCapitalDollars}
          />

          <Separator />

          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium">Plan total</span>
            <span className="text-lg font-semibold tracking-tight">
              {formatCents(totalCents)}
            </span>
          </div>
        </CardContent>
      </Card>

      <FormError message={state.error} />

      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" render={<Link href={cancelHref} />}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create plan"}
        </Button>
      </div>
    </form>
  );
}

type BucketFieldProps = {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (next: string) => void;
};

function BucketField({ id, label, hint, value, onChange }: BucketFieldProps) {
  return (
    <div className="grid items-start gap-2 sm:grid-cols-[1fr_auto] sm:gap-4">
      <div>
        <Label htmlFor={id}>{label}</Label>
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          $
        </span>
        <Input
          id={id}
          name={id}
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          placeholder="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-40 pl-6 text-right tabular-nums"
        />
      </div>
    </div>
  );
}