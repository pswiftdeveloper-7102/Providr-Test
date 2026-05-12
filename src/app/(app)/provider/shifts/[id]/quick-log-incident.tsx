"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import {
  quickLogIncidentAction,
  type QuickIncidentState,
} from "./actions";

const initial: QuickIncidentState = {};

type Severity = "MINOR" | "MODERATE";

export function QuickLogIncidentForm({
  shiftId,
  participantId,
}: {
  shiftId: string;
  participantId: string;
}) {
  const [state, formAction, pending] = useActionState(
    quickLogIncidentAction.bind(null, shiftId),
    initial
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [severity, setSeverity] = useState<Severity>("MINOR");

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setSeverity("MINOR");
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div className="space-y-2">
        <Label>Severity</Label>
        <input type="hidden" name="severity" value={severity} />
        <ToggleGroup
          value={[severity]}
          onValueChange={(vals) => {
            const v = vals[vals.length - 1];
            if (v === "MINOR" || v === "MODERATE") setSeverity(v);
          }}
          variant="outline"
          className="w-full"
        >
          <ToggleGroupItem value="MINOR" className="flex-1">
            Minor
          </ToggleGroupItem>
          <ToggleGroupItem value="MODERATE" className="flex-1">
            Moderate
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="space-y-2">
        <Label htmlFor="incident-description">What happened?</Label>
        <Textarea
          id="incident-description"
          name="description"
          rows={2}
          placeholder="One line is fine — bumped elbow on doorframe, no marks, observing."
          aria-invalid={!!state.fieldErrors?.description}
          required
        />
        {state.fieldErrors?.description && (
          <p className="text-xs text-destructive">
            {state.fieldErrors.description}
          </p>
        )}
      </div>

      {state.error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/provider/incidents/new?shiftId=${shiftId}&participantId=${participantId}`}
          className="text-xs text-muted-foreground hover:underline"
        >
          Serious or reportable? Use the full form →
        </Link>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Logging…" : "Log incident"}
        </Button>
      </div>
    </form>
  );
}