"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatDuration } from "@/lib/incident-clock";

type Props = {
  // Plain ISO strings so the prop survives server → client without
  // tripping the React serialization warning around Date.
  reportedAtIso: string | null;
  reportedToNdisAtIso: string | null;
  severity: "MINOR" | "MODERATE" | "SERIOUS" | "REPORTABLE";
};

const DAY_MS = 24 * 60 * 60 * 1000;
const TICK_MS = 1000; // refresh every second — small enough that the
// countdown feels live but cheap enough not to burn cycles.

export function LiveIncidentClock({
  reportedAtIso,
  reportedToNdisAtIso,
  severity,
}: Props) {
  // `now` re-renders the alert every TICK_MS. Server-rendered initial
  // state matches client because we coerce to `new Date()` at first paint.
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    if (severity !== "REPORTABLE") return;
    if (!reportedAtIso) return;
    if (reportedToNdisAtIso) return; // clock no longer relevant once submitted

    const id = setInterval(() => setNow(new Date()), TICK_MS);
    return () => clearInterval(id);
  }, [severity, reportedAtIso, reportedToNdisAtIso]);

  if (severity !== "REPORTABLE" || !reportedAtIso) return null;

  const reportedAt = new Date(reportedAtIso);
  const deadline = new Date(reportedAt.getTime() + DAY_MS);
  const submittedAt = reportedToNdisAtIso
    ? new Date(reportedToNdisAtIso)
    : null;

  if (submittedAt) {
    const onTime = submittedAt.getTime() <= deadline.getTime();
    return onTime ? (
      <Alert>
        <CheckCircle2 />
        <AlertTitle>Submitted on time</AlertTitle>
        <AlertDescription>
          Submitted to NDIS at {format(submittedAt, "dd/MM h:mm a")} — inside
          the 24-hour window.
        </AlertDescription>
      </Alert>
    ) : (
      <Alert variant="destructive">
        <AlertTriangle />
        <AlertTitle>Submitted late</AlertTitle>
        <AlertDescription>
          Submitted to NDIS at {format(submittedAt, "dd/MM h:mm a")}, past the
          deadline of {format(deadline, "dd/MM h:mm a")}.
        </AlertDescription>
      </Alert>
    );
  }

  const remainingMs = deadline.getTime() - now.getTime();
  if (remainingMs <= 0) {
    return (
      <Alert variant="destructive">
        <AlertTriangle />
        <AlertTitle>NDIS 24-hour deadline missed</AlertTitle>
        <AlertDescription>
          Overdue by {formatDuration(-remainingMs)}. Submit to the NDIS
          Commission as soon as possible.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert>
      <Clock />
      <AlertTitle>NDIS submission pending</AlertTitle>
      <AlertDescription>
        <span className="font-mono tabular-nums">
          {formatDuration(remainingMs)}
        </span>{" "}
        remaining to submit. Deadline:{" "}
        {format(deadline, "EEE, dd/MM, h:mm a")}.
      </AlertDescription>
    </Alert>
  );
}