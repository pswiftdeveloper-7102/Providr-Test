"use client";

import { useActionState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { addProgressNoteAction, type AddNoteState } from "./actions";

const initial: AddNoteState = {};

export function AddProgressNoteForm({ shiftId }: { shiftId: string }) {
  const [state, formAction, pending] = useActionState(
    addProgressNoteAction.bind(null, shiftId),
    initial
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Reset the textarea after a successful save.
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-2">
      <Textarea
        name="body"
        rows={3}
        placeholder="What just happened? — quick note, what was tried, how Sarah responded…"
        aria-invalid={!!state.fieldErrors?.body}
        required
      />
      {state.fieldErrors?.body && (
        <p className="text-xs text-destructive">{state.fieldErrors.body}</p>
      )}
      {state.error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      )}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Add note"}
        </Button>
      </div>
    </form>
  );
}