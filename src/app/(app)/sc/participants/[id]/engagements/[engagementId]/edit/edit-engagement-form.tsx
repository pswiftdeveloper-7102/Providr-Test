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
import { DateField } from "@/components/date-field";

import {
  updateEngagementAction,
  type EngagementFormState,
} from "../../actions";

const initial: EngagementFormState = {};

const STATUSES = [
  { value: "PROPOSED", label: "Proposed — exploring fit" },
  { value: "AGREEMENT_SENT", label: "Agreement sent — awaiting sign-off" },
  { value: "ACTIVE", label: "Active — delivering" },
  { value: "ENDED", label: "Ended" },
  { value: "DECLINED", label: "Declined" },
] as const;

type Status = (typeof STATUSES)[number]["value"];

export function EditEngagementForm({
  engagementId,
  cancelHref,
  values,
}: {
  engagementId: string;
  cancelHref: string;
  values: {
    status: string;
    startedAt: string;
    endedAt: string;
    serviceSummary: string;
    notes: string;
  };
}) {
  const [state, formAction, pending] = useActionState(
    updateEngagementAction.bind(null, engagementId),
    initial
  );
  const [status, setStatus] = useState<Status>(values.status as Status);

  return (
    <form action={formAction}>
      <Card>
        <CardHeader>
          <CardTitle>Engagement details</CardTitle>
          <CardDescription>
            Update the lifecycle as the relationship evolves.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              name="status"
              value={status}
              onValueChange={(v) => v && setStatus(v as Status)}
            >
              <BrandedSelectTrigger id="status" className="w-full">
                <SelectValue />
              </BrandedSelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <BrandedSelectItem key={s.value} value={s.value}>
                    {s.label}
                  </BrandedSelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <DateField name="startedAt" label="Started" defaultValue={values.startedAt} />
            <DateField name="endedAt" label="Ended" defaultValue={values.endedAt} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="serviceSummary">Service summary</Label>
            <Textarea
              id="serviceSummary"
              name="serviceSummary"
              rows={2}
              defaultValue={values.serviceSummary}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={2}
              defaultValue={values.notes}
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
  );
}