"use client";

import { useState, useTransition } from "react";
import { LogIn, LogOut, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { clockInAction, clockOutAction } from "./actions";

type Props = {
  shiftId: string;
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  actualStart: Date | null;
  actualEnd: Date | null;
  progressNoteCount: number;
};

export function ClockControls({
  shiftId,
  status,
  actualStart,
  actualEnd,
  progressNoteCount,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const noNotesYet = progressNoteCount === 0;
  const canClockOut = status === "IN_PROGRESS" && !noNotesYet;

  const onClockIn = () => {
    setError(null);
    startTransition(async () => {
      const res = await clockInAction(shiftId);
      if (res?.error) setError(res.error);
    });
  };
  const onClockOut = () => {
    setError(null);
    startTransition(async () => {
      const res = await clockOutAction(shiftId);
      if (res?.error) setError(res.error);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clock in / out</CardTitle>
        <CardDescription>
          {status === "SCHEDULED" &&
            "Tap to start the shift when you arrive."}
          {status === "IN_PROGRESS" &&
            "Shift in progress — clock out when you leave."}
          {status === "COMPLETED" &&
            "Shift completed. Records below remain editable for amendments."}
          {status === "CANCELLED" && "This shift was cancelled."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {status === "SCHEDULED" && (
            <Button onClick={onClockIn} disabled={pending}>
              <LogIn />
              {pending ? "Clocking in…" : "Clock in"}
            </Button>
          )}
          {status === "IN_PROGRESS" && (
            <Button
              onClick={onClockOut}
              disabled={pending || !canClockOut}
              title={
                noNotesYet
                  ? "Add at least one progress note before clocking out."
                  : undefined
              }
            >
              <LogOut />
              {pending ? "Clocking out…" : "Clock out"}
            </Button>
          )}
          {(status === "COMPLETED" || status === "CANCELLED") && (
            <span className="text-sm text-muted-foreground">
              No action available.
            </span>
          )}

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>
              Clocked in:{" "}
              <strong className="text-foreground">
                {actualStart ? format(actualStart, "h:mm a") : "—"}
              </strong>
            </span>
            <span>
              Clocked out:{" "}
              <strong className="text-foreground">
                {actualEnd ? format(actualEnd, "h:mm a") : "—"}
              </strong>
            </span>
          </div>
        </div>

        {status === "IN_PROGRESS" && noNotesYet && (
          <Alert>
            <AlertTriangle />
            <AlertTitle>Add a progress note before clocking out</AlertTitle>
            <AlertDescription>
              Notes get skipped most often at the end of a shift. Even a
              one-line &ldquo;quiet shift, no events&rdquo; counts.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}