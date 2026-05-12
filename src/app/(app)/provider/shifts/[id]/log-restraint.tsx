"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  BrandedSelectItem,
  BrandedSelectTrigger,
} from "@/components/branded-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormError } from "@/components/form-error";

import { logRestraintAction, type LogRestraintState } from "./actions";

const initial: LogRestraintState = {};

const TYPES = [
  { value: "PHYSICAL", label: "Physical" },
  { value: "MECHANICAL", label: "Mechanical" },
  { value: "CHEMICAL", label: "Chemical" },
  { value: "ENVIRONMENTAL", label: "Environmental" },
  { value: "SECLUSION", label: "Seclusion" },
] as const;

type RType = (typeof TYPES)[number]["value"];

function nowLocalIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function LogRestraintForm({ shiftId }: { shiftId: string }) {
  const [state, formAction, pending] = useActionState(
    logRestraintAction.bind(null, shiftId),
    initial
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState<RType>("PHYSICAL");

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setType("PHYSICAL");
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="restraint-type">
            Type<span className="ml-0.5 text-destructive">*</span>
          </Label>
          <Select
            name="type"
            value={type}
            onValueChange={(v) => v && setType(v as RType)}
          >
            <BrandedSelectTrigger id="restraint-type" className="w-full">
              <SelectValue />
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
          <Label htmlFor="restraint-when">
            Used at<span className="ml-0.5 text-destructive">*</span>
          </Label>
          <Input
            id="restraint-when"
            name="usedAt"
            type="datetime-local"
            defaultValue={nowLocalIso()}
            aria-invalid={!!state.fieldErrors?.usedAt}
            required
          />
          {state.fieldErrors?.usedAt && (
            <p className="text-xs text-destructive">
              {state.fieldErrors.usedAt}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="restraint-duration">Duration (minutes)</Label>
        <Input
          id="restraint-duration"
          name="durationMinutes"
          type="number"
          min="0"
          placeholder="e.g. 5"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="restraint-reason">
          Reason<span className="ml-0.5 text-destructive">*</span>
        </Label>
        <Textarea
          id="restraint-reason"
          name="reason"
          rows={2}
          placeholder="What was the participant doing? What risk was it managing?"
          aria-invalid={!!state.fieldErrors?.reason}
          required
        />
        {state.fieldErrors?.reason && (
          <p className="text-xs text-destructive">
            {state.fieldErrors.reason}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="restraint-outcome">Outcome</Label>
        <Textarea
          id="restraint-outcome"
          name="outcome"
          rows={2}
          placeholder="How it ended, any injury, any debrief actions."
        />
      </div>

      <FormError message={state.error} />

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Logging…" : "Log restraint"}
        </Button>
      </div>
    </form>
  );
}