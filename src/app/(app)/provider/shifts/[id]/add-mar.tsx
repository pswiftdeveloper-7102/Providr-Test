"use client";

import { useActionState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { addMarAction, type AddMarState } from "./actions";

const initial: AddMarState = {};

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

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

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
            <p className="text-xs text-destructive">
              {state.fieldErrors.dose}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="givenAt">
          Given at<span className="ml-0.5 text-destructive">*</span>
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
        <Label htmlFor="mar-notes">Notes</Label>
        <Textarea
          id="mar-notes"
          name="notes"
          rows={2}
          placeholder="Any context — taken with food, etc."
        />
      </div>

      {state.error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Logging…" : "Log dose"}
        </Button>
      </div>
    </form>
  );
}