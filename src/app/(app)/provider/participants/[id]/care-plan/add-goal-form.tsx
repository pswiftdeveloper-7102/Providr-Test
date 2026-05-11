"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { GoalCategory } from "@prisma/client";

import { addGoalAction, type AddGoalState } from "./actions";

const initial: AddGoalState = {};

const CATEGORY_LABEL: Record<GoalCategory, string> = {
  SOCIAL: "Social participation",
  PHYSICAL: "Physical wellbeing",
  COMMUNICATION: "Communication",
  INDEPENDENT_LIVING: "Independent living",
  COMMUNITY_PARTICIPATION: "Community participation",
  EMPLOYMENT: "Employment",
  OTHER: "Other",
};

const CATEGORIES: GoalCategory[] = [
  "SOCIAL",
  "PHYSICAL",
  "COMMUNICATION",
  "INDEPENDENT_LIVING",
  "COMMUNITY_PARTICIPATION",
  "EMPLOYMENT",
  "OTHER",
];

export function AddGoalForm({ carePlanId }: { carePlanId: string }) {
  const [state, formAction, pending] = useActionState(
    addGoalAction.bind(null, carePlanId),
    initial
  );
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<GoalCategory>("SOCIAL");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setCategory("SOCIAL");
      setOpen(false);
    }
  }, [state]);

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus />
        Add goal
      </Button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 rounded-md border bg-muted/30 p-3"
    >
      <div className="space-y-2">
        <Label htmlFor="goal-title">
          Goal<span className="ml-0.5 text-destructive">*</span>
        </Label>
        <Input
          id="goal-title"
          name="title"
          placeholder="e.g. Walk to the park independently"
          required
          aria-invalid={!!state.fieldErrors?.title}
        />
        {state.fieldErrors?.title && (
          <p className="text-xs text-destructive">{state.fieldErrors.title}</p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="goal-category">Category</Label>
          <Select
            name="category"
            value={category}
            onValueChange={(v) => v && setCategory(v as GoalCategory)}
          >
            <SelectTrigger id="goal-category" className="w-full">
              <SelectValue>{CATEGORY_LABEL[category]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="goal-targetDate">Target date</Label>
          <Input id="goal-targetDate" name="targetDate" type="date" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="goal-description">Detail</Label>
        <Textarea
          id="goal-description"
          name="description"
          rows={2}
          placeholder="What does success look like?"
        />
      </div>

      {state.error && (
        <p className="text-xs text-destructive">{state.error}</p>
      )}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save goal"}
        </Button>
      </div>
    </form>
  );
}