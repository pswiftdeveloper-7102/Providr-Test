"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
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
  // Q1: same-org hybrid disclosure. UI shows checkbox conditionally;
  // server still verifies the condition and refuses without ack.
  coiAcknowledged: z.string().optional(),
  // Q2: free-text override when proceeding with an expired Worker Check.
  expiredCheckOverride: z.string().trim().optional().or(z.literal("")),
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
    workerId: formData.get("workerId") ?? undefined,
    participantId: formData.get("participantId") ?? undefined,
    date: formData.get("date") ?? undefined,
    startTime: formData.get("startTime") ?? undefined,
    endTime: formData.get("endTime") ?? undefined,
    coiAcknowledged: formData.get("coiAcknowledged") ?? undefined,
    expiredCheckOverride: formData.get("expiredCheckOverride") ?? undefined,
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

  // Q2 (2026-05-12): soft-block on expired NDIS Worker Check. Previously
  // a hard error; now the admin can proceed by supplying an override
  // reason that gets stored on the Shift for audit.
  const ndis = certStatus(worker.ndisWorkerCheckExpiry, start);
  const expiredCheckOverride = data.expiredCheckOverride ?? "";
  if (ndis === "expired" && expiredCheckOverride.length < 5) {
    return {
      fieldErrors: {
        expiredCheckOverride: worker.ndisWorkerCheckExpiry
          ? `Worker's NDIS Worker Screening Check expired on ${worker.ndisWorkerCheckExpiry.toLocaleDateString()}. Type a reason (e.g. "renewal in progress, expected dd/mm/yyyy") to proceed.`
          : "Worker's NDIS Worker Screening Check status unknown. Type a reason to proceed.",
      },
    };
  }

  // Q1 (2026-05-12): same-org hybrid CoI disclosure. When the Org holds
  // both PROVIDER + SC entitlements AND has an active engagement with
  // this participant on the SC side, NDIS requires the conflict to be
  // disclosed when the same Org also rosters them on the Provider side.
  const orgEntitlements = await db.orgEntitlement.findMany({
    where: { orgId: context.activeOrg.id, active: true },
    select: { portal: true },
  });
  const isHybridOrg =
    orgEntitlements.some((e) => e.portal === "PROVIDER") &&
    orgEntitlements.some((e) => e.portal === "SC");

  let coiApplies = false;
  if (isHybridOrg) {
    const engagement = await db.scEngagement.findFirst({
      where: {
        participantId: participant.id,
        status: { in: ["PROPOSED", "AGREEMENT_SENT", "ACTIVE"] },
        externalProvider: { orgId: context.activeOrg.id },
      },
      select: { id: true },
    });
    coiApplies = !!engagement;
  }

  const coiAcknowledged =
    data.coiAcknowledged === "on" || data.coiAcknowledged === "true";

  if (coiApplies && !coiAcknowledged) {
    return {
      fieldErrors: {
        coiAcknowledged:
          "Tick the conflict of interest disclosure to continue. NDIS requires the participant to be informed when the same organisation both coordinates and delivers their care.",
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

  const session = await auth();
  const now = new Date();

  await db.shift.create({
    data: {
      orgId: context.activeOrg.id,
      workerId: worker.id,
      participantId: participant.id,
      scheduledStart: start,
      scheduledEnd: end,
      status: "SCHEDULED",
      coiAcknowledged: coiApplies && coiAcknowledged,
      coiAcknowledgedAt: coiApplies && coiAcknowledged ? now : null,
      coiAcknowledgedBy:
        coiApplies && coiAcknowledged ? session?.user?.id ?? null : null,
      expiredCheckOverride:
        ndis === "expired" ? expiredCheckOverride : null,
      expiredCheckOverrideAt: ndis === "expired" ? now : null,
      expiredCheckOverrideBy:
        ndis === "expired" ? session?.user?.id ?? null : null,
    },
  });

  revalidatePath("/provider/roster");
  redirect("/provider/roster");
}