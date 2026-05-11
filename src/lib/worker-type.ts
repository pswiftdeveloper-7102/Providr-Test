import type { WorkerType } from "@prisma/client";

// Maps to Provider Scene 4's three teams: daily helpers, therapy team,
// behaviour expert. The labels match how the diagram talks to the client,
// not the enum.

export const WORKER_TYPE_LABEL: Record<WorkerType, string> = {
  SUPPORT_WORKER: "Support worker",
  ALLIED_HEALTH: "Allied health",
  BEHAVIOUR_SUPPORT: "Behaviour support",
};

export const WORKER_TYPE_DESCRIPTION: Record<WorkerType, string> = {
  SUPPORT_WORKER: "Hands-on daily helpers — Scene 4 \"daily helpers\".",
  ALLIED_HEALTH:
    "Therapists — physio, OT, speech, psychology. Scene 4 \"therapy team\".",
  BEHAVIOUR_SUPPORT:
    "Behaviour support practitioners — Scene 4 \"behaviour expert\".",
};

export const WORKER_TYPES: WorkerType[] = [
  "SUPPORT_WORKER",
  "ALLIED_HEALTH",
  "BEHAVIOUR_SUPPORT",
];