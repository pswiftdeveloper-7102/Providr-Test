"use client";

import { useActionState, useState } from "react";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  updateGoalEvidenceAction,
  type GoalEvidenceState,
} from "./goal-evidence-actions";

const initial: GoalEvidenceState = {};

export function GoalEvidenceForm({
  goalId,
  initialSummary,
}: {
  goalId: string;
  initialSummary: string;
}) {
  const [state, formAction, pending] = useActionState(
    updateGoalEvidenceAction.bind(null, goalId),
    initial
  );
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <div className="flex items-start gap-2">
        <p className="flex-1 text-xs text-muted-foreground whitespace-pre-wrap">
          {initialSummary || (
            <span className="italic">No evidence summary yet.</span>
          )}
        </p>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setEditing(true)}
          aria-label="Edit evidence summary"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <Label htmlFor={`evidence-${goalId}`} className="text-xs uppercase">
        Evidence summary
      </Label>
      <Textarea
        id={`evidence-${goalId}`}
        name="evidenceSummary"
        rows={3}
        defaultValue={initialSummary}
        placeholder="What worked toward this goal? What's still needed for next plan?"
      />
      {state.error && (
        <p className="text-xs text-destructive">{state.error}</p>
      )}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setEditing(false)}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}