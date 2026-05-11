"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import { assertManager } from "@/lib/rbac";
import { certStatus } from "@/lib/certificates";

const createShiftSchema = z.object({
  workerId: z.string().min(1, "Pick a worker."),
  participantId: z.string().min(1, "Pick a participant."),
  date: z.string().min(1, "Date is required."),
  startTime: z.string().min(1, "Start time is required."),
  endTime: z.string().min(1, "End time is required."),
});

export type CreateShiftState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function combineDateAndTime(date: string, time: string): Date {
  // Both inputs are "YYYY-MM-DD" and "HH:MM" from native HTML inputs in the
  // user's local timezone. Construct as local time.
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(y, (m ?? 1) - 1, d, hh ?? 0, mm ?? 0, 0, 0);
}

export async function createShiftAction(
  _prev: CreateShiftState,
  formData: FormData
): Promise<CreateShiftState> {
  const context = await resolvePortalContext("provider");
  assertManager(context);

  const parsed = createShiftSchema.safeParse({
    workerId: formData.get("workerId"),
    participantId: formData.get("participantId"),
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const data = parsed.data;

  // Worker and participant must both belong to the active org.
  const [worker, participant] = await Promise.all([
    db.worker.findFirst({
      where: { id: data.workerId, orgId: context.activeOrg.id },
    }),
    db.participant.findFirst({
      where: { id: data.participantId, orgId: context.activeOrg.id },
    }),
  ]);
  if (!worker) {
    return { fieldErrors: { workerId: "Worker not found in this org." } };
  }
  if (!participant) {
    return {
      fieldErrors: { participantId: "Participant not found in this org." },
    };
  }

  const start = combineDateAndTime(data.date, data.startTime);
  const end = combineDateAndTime(data.date, data.endTime);
  if (end <= start) {
    return {
      fieldErrors: { endTime: "End time must be after start time." },
    };
  }

  // Gate on screening: an expired NDIS Worker Check blocks rostering.
  // (Expiring-soon is just a warning surfaced in the UI; not a hard block.)
  const ndis = certStatus(worker.ndisWorkerCheckExpiry, start);
  if (ndis === "expired") {
    return {
      fieldErrors: {
        workerId:
          "This worker's NDIS Worker Check is expired. Update it before rostering.",
      },
    };
  }

  // Soft conflict check: warn if this worker already has an overlapping shift.
  const conflict = await db.shift.findFirst({
    where: {
      workerId: worker.id,
      status: { in: ["SCHEDULED", "IN_PROGRESS"] },
      scheduledStart: { lt: end },
      scheduledEnd: { gt: start },
    },
    select: { id: true },
  });
  if (conflict) {
    return {
      fieldErrors: {
        startTime:
          "This worker already has a shift overlapping this time window.",
      },
    };
  }

  await db.shift.create({
    data: {
      orgId: context.activeOrg.id,
      workerId: worker.id,
      participantId: participant.id,
      scheduledStart: start,
      scheduledEnd: end,
      status: "SCHEDULED",
    },
  });

  revalidatePath("/provider/roster");
  redirect("/provider/roster");
}