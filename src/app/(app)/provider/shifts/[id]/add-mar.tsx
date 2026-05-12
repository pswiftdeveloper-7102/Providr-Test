"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BrandedSelectItem,
  BrandedSelectTrigger,
} from "@/components/branded-select";
import { Select, SelectContent, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormError } from "@/components/form-error";

import { addMarAction, type AddMarState } from "./actions";

const initial: AddMarState = {};

type Status =
  | "GIVEN"
  | "REFUSED"
  | "UNAVAILABLE"
  | "OUT_OF_STOCK"
  | "FORGOTTEN"
  | "CLINICAL_HOLD"
  | "OTHER";

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: "GIVEN", label: "Given" },
  { value: "REFUSED", label: "Participant refused" },
  { value: "UNAVAILABLE", label: "Participant unavailable" },
  { value: "OUT_OF_STOCK", label: "Medication out of stock" },
  { value: "FORGOTTEN", label: "Carer forgot" },
  { value: "CLINICAL_HOLD", label: "Clinical decision (held on purpose)" },
  { value: "OTHER", label: "Other" },
];

function nowLocalIso(): string {
  // Format current time as the value for <input type="datetime-local">
  // in the user's local timezone — datetime-local doesn't accept a Z suffix.
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AddMarForm({ shiftId }: { shiftId: string }) {
  const [state, formAction, pending] = useActionState(
    addMarAction.bind(null, shiftId),
    initial
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<Status>("GIVEN");
  const [isPrn, setIsPrn] = useState(false);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setStatus("GIVEN");
      setIsPrn(false);
    }
  }, [state]);

  const wasGiven = status === "GIVEN";
  const showMissedReason = status !== "GIVEN";
  const missedReasonRequired = status === "OTHER";
  const showPrnFields = isPrn && wasGiven;

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="medication">
            Medication<span className="ml-0.5 text-destructive">*</span>
          </Label>
          <Input
            id="medication"
            name="medication"
            placeholder="Paracetamol"
            aria-invalid={!!state.fieldErrors?.medication}
            required
          />
          {state.fieldErrors?.medication && (
            <p className="text-xs text-destructive">
              {state.fieldErrors.medication}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="dose">Dose</Label>
          <Input
            id="dose"
            name="dose"
            placeholder="500 mg"
            aria-invalid={!!state.fieldErrors?.dose}
          />
          {state.fieldErrors?.dose && (
            <p className="text-xs text-destructive">{state.fieldErrors.dose}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="givenAt">
          Time<span className="ml-0.5 text-destructive">*</span>
        </Label>
        <Input
          id="givenAt"
          name="givenAt"
          type="datetime-local"
          defaultValue={nowLocalIso()}
          aria-invalid={!!state.fieldErrors?.givenAt}
          required
        />
        {state.fieldErrors?.givenAt && (
          <p className="text-xs text-destructive">
            {state.fieldErrors.givenAt}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Outcome</Label>
        <Select
          name="status"
          value={status}
          onValueChange={(v) => v && setStatus(v as Status)}
        >
          <BrandedSelectTrigger id="status" className="w-full">
            <SelectValue />
          </BrandedSelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <BrandedSelectItem key={o.value} value={o.value}>
                {o.label}
              </BrandedSelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showMissedReason && (
        <div className="space-y-2">
          <Label htmlFor="missedReason">
            Details
            {missedReasonRequired && (
              <span className="ml-0.5 text-destructive">*</span>
            )}
          </Label>
          <Textarea
            id="missedReason"
            name="missedReason"
            rows={2}
            placeholder={
              missedReasonRequired
                ? "Describe what happened."
                : "Optional — add context if helpful."
            }
            aria-invalid={!!state.fieldErrors?.missedReason}
            required={missedReasonRequired}
          />
          {state.fieldErrors?.missedReason && (
            <p className="text-xs text-destructive">
              {state.fieldErrors.missedReason}
            </p>
          )}
        </div>
      )}

      {wasGiven && (
        <label className="flex items-center gap-2">
          <Checkbox
            id="isPrn"
            name="isPrn"
            checked={isPrn}
            onCheckedChange={(checked) => setIsPrn(checked === true)}
          />
          <span className="text-sm">This was PRN (as needed)</span>
        </label>
      )}

      {showPrnFields && (
        <div className="space-y-3 rounded-md border border-dashed bg-muted/30 p-3">
          <div className="space-y-2">
            <Label htmlFor="prnReason">
              Why was it given?
              <span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Textarea
              id="prnReason"
              name="prnReason"
              rows={2}
              placeholder="E.g. participant reported a headache, pain score 6/10."
              aria-invalid={!!state.fieldErrors?.prnReason}
            />
            {state.fieldErrors?.prnReason && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.prnReason}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="prnOutcome">Outcome</Label>
            <Textarea
              id="prnOutcome"
              name="prnOutcome"
              rows={2}
              placeholder="Can be filled in later — once the medication takes effect."
            />
            <p className="text-xs text-muted-foreground">
              Leave blank if it&apos;s too soon to know. Add it later.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="mar-notes">Notes</Label>
        <Textarea
          id="mar-notes"
          name="notes"
          rows={2}
          placeholder="Any other context — taken with food, etc."
        />
      </div>

      <FormError message={state.error} />

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Logging…" : "Log dose"}
        </Button>
      </div>
    </form>
  );
}