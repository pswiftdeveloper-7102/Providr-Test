"use client";

import { useActionState, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { signCoIAction, type SignCoIState } from "./actions";

const initial: SignCoIState = {};

export function SignCoIForm() {
  const [state, formAction, pending] = useActionState(signCoIAction, initial);
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="coi-notes">Notes (optional)</Label>
        <Textarea
          id="coi-notes"
          name="notes"
          rows={3}
          placeholder="E.g. how you'll separate clinical and coordination roles for shared participants."
        />
      </div>

      <label className="flex items-start gap-3 cursor-pointer rounded-md border p-3">
        <Checkbox
          name="acknowledged"
          checked={acknowledged}
          onCheckedChange={(checked) => setAcknowledged(checked === true)}
          className="mt-0.5"
        />
        <span className="flex-1 text-sm">
          I confirm that, as a hybrid Provider + Support Coordination
          organisation, I understand and will manage the conflict of interest
          between the two roles in line with NDIS Practice Standards. I will
          disclose this conflict to participants and will not coerce
          participants to use related services.
        </span>
      </label>
      {state.fieldErrors?.acknowledged && (
        <p className="text-xs text-destructive">
          {state.fieldErrors.acknowledged}
        </p>
      )}

      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      {state.ok && (
        <Alert>
          <AlertDescription>
            Thanks — your acknowledgement is recorded. The banner will
            disappear on your next page load.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={!acknowledged || pending}>
          {pending ? "Recording…" : "Sign acknowledgement"}
        </Button>
      </div>
    </form>
  );
}