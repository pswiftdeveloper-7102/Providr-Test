// NDIS reportable-incident 24-hour deadline math.
//
// Per NDIS Quality and Safeguards rules, a reportable incident must be
// notified to the Commission within 24 hours of the provider becoming
// aware of it. We model "becoming aware" as `reportedAt` on the incident
// (set when the manager is informed). The clock starts there.
//
// Open question for the client (still): exactly what triggers the clock —
// shift end / manager informed / participant report. Defaulting to
// `reportedAt` here is sensible until that's confirmed.

import type { Incident, IncidentSeverity } from "@prisma/client";

const DAY_MS = 24 * 60 * 60 * 1000;

export type ClockState =
  | { kind: "not-applicable" }            // not a REPORTABLE incident, or no reportedAt
  | { kind: "pending"; deadline: Date; remainingMs: number }
  | { kind: "overdue-unsubmitted"; deadline: Date; overdueByMs: number }
  | { kind: "submitted-on-time"; deadline: Date; submittedAt: Date }
  | { kind: "submitted-late"; deadline: Date; submittedAt: Date };

export function clockState(
  incident: Pick<
    Incident,
    "severity" | "reportedAt" | "reportedToNdisAt"
  >,
  now: Date = new Date()
): ClockState {
  if (incident.severity !== "REPORTABLE") return { kind: "not-applicable" };
  if (!incident.reportedAt) return { kind: "not-applicable" };

  const deadline = new Date(incident.reportedAt.getTime() + DAY_MS);
  const submittedAt = incident.reportedToNdisAt;

  if (submittedAt) {
    return submittedAt.getTime() <= deadline.getTime()
      ? { kind: "submitted-on-time", deadline, submittedAt }
      : { kind: "submitted-late", deadline, submittedAt };
  }

  const remainingMs = deadline.getTime() - now.getTime();
  if (remainingMs <= 0) {
    return {
      kind: "overdue-unsubmitted",
      deadline,
      overdueByMs: -remainingMs,
    };
  }
  return { kind: "pending", deadline, remainingMs };
}

export function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(Math.abs(ms) / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export const SEVERITY_LABEL: Record<IncidentSeverity, string> = {
  MINOR: "Minor",
  MODERATE: "Moderate",
  SERIOUS: "Serious",
  REPORTABLE: "Reportable",
};