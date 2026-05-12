"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormError } from "@/components/form-error";

import {
  updateSpendAction,
  deleteSpendAction,
  type SpendFormState,
} from "../../actions";

const initial: SpendFormState = {};

export function EditSpendForm({
  spendId,
  cancelHref,
  values,
}: {
  spendId: string;
  cancelHref: string;
  values: {
    amount: string;
    occurredAt: string;
    description: string;
    providerName: string;
  };
}) {
  const [state, formAction, pending] = useActionState(
    updateSpendAction.bind(null, spendId),
    initial
  );

  return (
    <div className="space-y-4">
      <form action={formAction}>
        <Card>
          <CardHeader>
            <CardTitle>Spend entry</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (AUD)</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={values.amount}
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
                <Label htmlFor="occurredAt">When</Label>
                <Input
                  id="occurredAt"
                  name="occurredAt"
                  type="date"
                  defaultValue={values.occurredAt}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                rows={2}
                defaultValue={values.description}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="providerName">Provider</Label>
              <Input
                id="providerName"
                name="providerName"
                defaultValue={values.providerName}
              />
            </div>

            <FormError message={state.error} />

            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" render={<Link href={cancelHref} />}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      <form action={deleteSpendAction.bind(null, spendId)}>
        <Card>
          <CardContent className="flex items-center justify-between gap-3 py-4">
            <div className="text-sm text-muted-foreground">
              Logged this in error? Deleting reverses the bucket total.
            </div>
            <Button type="submit" variant="destructive" size="sm">
              Delete entry
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}