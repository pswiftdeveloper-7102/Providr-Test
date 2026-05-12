"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  BrandedSelectItem,
  BrandedSelectTrigger,
} from "@/components/branded-select";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormError } from "@/components/form-error";

import {
  updateEscalationAction,
  type EscalationFormState,
} from "../actions";

const initial: EscalationFormState = {};

const STATUSES = [
  { value: "OPEN", label: "Open — not started" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "RESOLVED", label: "Resolved" },
] as const;

type Status = (typeof STATUSES)[number]["value"];

export function ResolveEscalationForm({
  escalationId,
  initialStatus,
  initialResolution,
  reopenLabel,
}: {
  escalationId: string;
  initialStatus: Status;
  initialResolution: string;
  reopenLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(
    updateEscalationAction.bind(null, escalationId),
    initial
  );
  const [status, setStatus] = useState<Status>(initialStatus);
  const showResolution = status === "RESOLVED";

  return (
    <form action={formAction} className="space-y-4">
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

      {showResolution && (
        <div className="space-y-2">
          <Label htmlFor="resolution">Resolution</Label>
          <Textarea
            id="resolution"
            name="resolution"
            rows={3}
            defaultValue={initialResolution}
            placeholder="What you did, what changed, what to watch for next."
          />
        </div>
      )}

      <FormError message={state.error} />

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : (reopenLabel ?? "Save")}
        </Button>
      </div>
    </form>
  );
}