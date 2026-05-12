"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { FormError } from "@/components/form-error";

import { addProgressNoteAction, type AddNoteState } from "./actions";

const initial: AddNoteState = {};

export function AddProgressNoteForm({ shiftId }: { shiftId: string }) {
  const [state, formAction, pending] = useActionState(
    addProgressNoteAction.bind(null, shiftId),
    initial
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [isHandover, setIsHandover] = useState(false);

  // Reset the textarea after a successful save.
  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setIsHandover(false);
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-2">
      <Textarea
        name="body"
        rows={3}
        placeholder={
          isHandover
            ? "Brief the next worker — what's done, what's pending, anything they should watch for."
            : "What just happened? — quick note, what was tried, how Sarah responded…"
        }
        aria-invalid={!!state.fieldErrors?.body}
        required
      />
      {state.fieldErrors?.body && (
        <p className="text-xs text-destructive">{state.fieldErrors.body}</p>
      )}

      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          name="isHandover"
          checked={isHandover}
          onCheckedChange={(checked) => setIsHandover(checked === true)}
        />
        End-of-shift handover (briefs the next worker)
      </label>

      <FormError message={state.error} />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : isHandover ? "Save handover" : "Add note"}
        </Button>
      </div>
    </form>
  );
}