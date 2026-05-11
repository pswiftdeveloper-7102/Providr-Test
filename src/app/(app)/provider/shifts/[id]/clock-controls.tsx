"use client";

import { useTransition } from "react";
import { LogIn, LogOut } from "lucide-react";
import { format } from "date-fns";

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
};

export function ClockControls({
  shiftId,
  status,
  actualStart,
  actualEnd,
}: Props) {
  const [pending, startTransition] = useTransition();

  const onClockIn = () => {
    startTransition(async () => {
      await clockInAction(shiftId);
    });
  };
  const onClockOut = () => {
    startTransition(async () => {
      await clockOutAction(shiftId);
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
      <CardContent>
        <div className="flex flex-wrap items-center gap-3">
          {status === "SCHEDULED" && (
            <Button onClick={onClockIn} disabled={pending}>
              <LogIn />
              {pending ? "Clocking in…" : "Clock in"}
            </Button>
          )}
          {status === "IN_PROGRESS" && (
            <Button onClick={onClockOut} disabled={pending}>
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
      </CardContent>
    </Card>
  );
}