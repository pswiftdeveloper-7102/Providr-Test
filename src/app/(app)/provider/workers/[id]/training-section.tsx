"use client";

import { useActionState, useEffect, useRef } from "react";
import { GraduationCap, Trash2 } from "lucide-react";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { FormError } from "@/components/form-error";
import { DateField } from "@/components/date-field";

import {
  addTrainingAction,
  deleteTrainingAction,
  type AddTrainingState,
} from "./actions";

const initial: AddTrainingState = {};

type Record = {
  id: string;
  title: string;
  provider: string | null;
  completedAt: Date;
  expiresAt: Date | null;
  notes: string | null;
};

export function TrainingSection({
  workerId,
  records,
}: {
  workerId: string;
  records: Record[];
}) {
  const [state, formAction, pending] = useActionState(
    addTrainingAction.bind(null, workerId),
    initial
  );
  const formRef = useRef<HTMLFormElement>(null);
  const now = new Date();

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-muted-foreground" />
          <CardTitle>Training</CardTitle>
        </div>
        <CardDescription>
          The longer tail of ongoing development. NDIS Worker Check and
          First Aid live above as hard cert gates.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form ref={formRef} action={formAction} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="training-title">
                Training<span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Input
                id="training-title"
                name="title"
                placeholder="Manual Handling Refresher"
                aria-invalid={!!state.fieldErrors?.title}
                required
              />
              {state.fieldErrors?.title && (
                <p className="text-xs text-destructive">
                  {state.fieldErrors.title}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="training-provider">Provider</Label>
              <Input
                id="training-provider"
                name="provider"
                placeholder="Acme Training Co."
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <DateField name="completedAt" label="Completed" required />
            <DateField name="expiresAt" label="Expires (optional)" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="training-notes">Notes</Label>
            <Textarea
              id="training-notes"
              name="notes"
              rows={2}
              placeholder="Any context — refresher cycle, specific scenarios covered…"
            />
          </div>

          <FormError message={state.error} />

          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Saving…" : "Add training"}
            </Button>
          </div>
        </form>

        {records.length > 0 && (
          <>
            <Separator />
            <ul className="space-y-2">
              {records.map((r) => {
                const expired =
                  r.expiresAt && r.expiresAt < now ? true : false;
                return (
                  <li
                    key={r.id}
                    className="rounded-md border bg-muted/30 px-3 py-2"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-sm font-medium">{r.title}</span>
                      <div className="flex items-center gap-2">
                        {expired && (
                          <Badge variant="destructive" className="text-[10px]">
                            expired
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {format(r.completedAt, "dd/MM/yyyy")}
                          {r.expiresAt &&
                            ` → ${format(r.expiresAt, "dd/MM/yyyy")}`}
                        </span>
                        <form action={deleteTrainingAction.bind(null, r.id)}>
                          <Button
                            type="submit"
                            size="sm"
                            variant="ghost"
                            aria-label="Delete training record"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </form>
                      </div>
                    </div>
                    {r.provider && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {r.provider}
                      </p>
                    )}
                    {r.notes && (
                      <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">
                        {r.notes}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}