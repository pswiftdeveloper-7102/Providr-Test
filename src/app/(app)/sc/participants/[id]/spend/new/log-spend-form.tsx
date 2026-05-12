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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormError } from "@/components/form-error";
import { formatCents } from "@/lib/utils";

import { logSpendAction, type SpendFormState } from "../actions";

const initial: SpendFormState = {};

const BUCKET_LABEL: Record<string, string> = {
  CORE: "Core supports",
  CAPACITY: "Capacity building",
  CAPITAL: "Capital",
};

type Bucket = {
  id: string;
  category: string;
  totalCents: number;
  spentCents: number;
};

function todayLocalDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function LogSpendForm({
  participantId,
  buckets,
  cancelHref,
}: {
  participantId: string;
  buckets: Bucket[];
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(
    logSpendAction.bind(null, participantId),
    initial
  );
  const [planBudgetId, setPlanBudgetId] = useState(buckets[0]?.id ?? "");

  return (
    <form action={formAction}>
      <Card>
        <CardHeader>
          <CardTitle>Spend entry</CardTitle>
          <CardDescription>
            Updates the running total on the selected bucket.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="planBudgetId">
              Bucket<span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Select
              name="planBudgetId"
              value={planBudgetId}
              onValueChange={(v) => setPlanBudgetId(v ?? "")}
            >
              <BrandedSelectTrigger id="planBudgetId" className="w-full">
                <SelectValue />
              </BrandedSelectTrigger>
              <SelectContent>
                {buckets.map((b) => {
                  const remaining = b.totalCents - b.spentCents;
                  return (
                    <BrandedSelectItem key={b.id} value={b.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {BUCKET_LABEL[b.category] ?? b.category}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatCents(remaining)} remaining
                        </span>
                      </div>
                    </BrandedSelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {state.fieldErrors?.planBudgetId && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.planBudgetId}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount">
                Amount (AUD)<span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                aria-invalid={!!state.fieldErrors?.amount}
                required
              />
              {state.fieldErrors?.amount && (
                <p className="text-xs text-destructive">
                  {state.fieldErrors.amount}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="occurredAt">
                When<span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Input
                id="occurredAt"
                name="occurredAt"
                type="date"
                defaultValue={todayLocalDate()}
                aria-invalid={!!state.fieldErrors?.occurredAt}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              What was it for?
              <span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              name="description"
              rows={2}
              placeholder="E.g. 8 hours support work, week of 5 May"
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
            <Label htmlFor="providerName">Provider (optional)</Label>
            <Input
              id="providerName"
              name="providerName"
              placeholder="Acme Disability Support"
            />
          </div>

          <FormError message={state.error} />

          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" render={<Link href={cancelHref} />}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Log spend"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}