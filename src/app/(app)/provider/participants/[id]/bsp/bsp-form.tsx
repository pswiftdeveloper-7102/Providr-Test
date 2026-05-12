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
import {
  BrandedSelectItem,
  BrandedSelectTrigger,
} from "@/components/branded-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormError } from "@/components/form-error";
import { DateField } from "@/components/date-field";

import {
  createBSPAction,
  updateBSPAction,
  type BSPFormState,
} from "./actions";

const initial: BSPFormState = {};

export type BSPFormValues = {
  effectiveFrom: string | null;
  effectiveTo: string | null;
  authoredById: string | null;
  summary: string | null;
  triggers: string | null;
  deescalation: string | null;
  whatNotToDo: string | null;
};

export type BSPAuthorOption = {
  id: string;
  firstName: string;
  lastName: string;
};

type Props = {
  participantId: string;
  cancelHref: string;
  bspId?: string;
  values?: BSPFormValues;
  authorOptions: BSPAuthorOption[];
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

export function BSPForm({
  participantId,
  cancelHref,
  bspId,
  values,
  authorOptions,
}: Props) {
  const isEdit = !!bspId;
  const action = isEdit
    ? updateBSPAction.bind(null, bspId!)
    : createBSPAction.bind(null, participantId);
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction}>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Plan details</CardTitle>
            <CardDescription>
              The behaviour support practitioner who wrote it and when it
              applies.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <DateField name="effectiveFrom" label="Effective from" defaultValue={dateForInput(values?.effectiveFrom)} />
              <DateField name="effectiveTo" label="Effective to" defaultValue={dateForInput(values?.effectiveTo)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="authoredById">Authored by</Label>
              <Select
                name="authoredById"
                defaultValue={values?.authoredById ?? ""}
              >
                <BrandedSelectTrigger id="authoredById" className="w-full">
                  <SelectValue placeholder="Choose behaviour support practitioner" />
                </BrandedSelectTrigger>
                <SelectContent>
                  {authorOptions.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      No behaviour support workers yet — add one under
                      Workers.
                    </div>
                  ) : (
                    authorOptions.map((w) => (
                      <BrandedSelectItem key={w.id} value={w.id}>
                        {w.firstName} {w.lastName}
                      </BrandedSelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="summary">Summary</Label>
              <Textarea
                id="summary"
                name="summary"
                rows={3}
                defaultValue={values?.summary ?? ""}
                placeholder="Brief overview — the behaviour, the goal of the plan, key context."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operational sections</CardTitle>
            <CardDescription>
              The three sections support workers actually act on during a
              shift. Be specific.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="triggers">Triggers</Label>
              <Textarea
                id="triggers"
                name="triggers"
                rows={4}
                defaultValue={values?.triggers ?? ""}
                placeholder="What sets off the behaviour. Environmental, social, sensory, internal."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deescalation">De-escalation strategies</Label>
              <Textarea
                id="deescalation"
                name="deescalation"
                rows={4}
                defaultValue={values?.deescalation ?? ""}
                placeholder="What to do, in what order. The plan workers reach for in the moment."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatNotToDo">
                What NOT to do
                <span className="ml-2 text-[10px] uppercase tracking-wider text-destructive">
                  Highlighted to workers
                </span>
              </Label>
              <Textarea
                id="whatNotToDo"
                name="whatNotToDo"
                rows={4}
                defaultValue={values?.whatNotToDo ?? ""}
                placeholder="Things that make it worse — phrases, postures, restraint techniques, foods, etc."
              />
            </div>
          </CardContent>
        </Card>

        <FormError message={state.error} />

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
                : "Create BSP"}
          </Button>
        </div>
      </div>
    </form>
  );
}