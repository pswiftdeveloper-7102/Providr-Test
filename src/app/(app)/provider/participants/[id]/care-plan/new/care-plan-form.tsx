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
  type CreateCarePlanState,
} from "../actions";

const initial: CreateCarePlanState = {};

export function CarePlanForm({
  participantId,
  cancelHref,
}: {
  participantId: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(
    createCarePlanAction.bind(null, participantId),
    initial
  );

  return (
    <form action={formAction}>
      <Card>
        <CardHeader>
          <CardTitle>Plan details</CardTitle>
          <CardDescription>
            Dates and summary now; goals can be added once the plan is in
            place.
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
              placeholder="Brief overview — main supports, key worker, anything urgent…"
              aria-invalid={!!state.fieldErrors?.summary}
            />
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
              {pending ? "Creating…" : "Create care plan"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}