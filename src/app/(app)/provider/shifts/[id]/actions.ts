"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import { dispatchNotification } from "@/lib/notifications/dispatch";

// Confirm the shift exists and belongs to the active org before mutating.
async function loadShift(shiftId: string) {
  const context = await resolvePortalContext("provider");
  const shift = await db.shift.findFirst({
    where: { id: shiftId, orgId: context.activeOrg.id },
  });
  return { context, shift };
}

export async function clockInAction(shiftId: string) {
  const { shift } = await loadShift(shiftId);
  if (!shift) return { error: "Shift not found." };
  if (shift.status === "COMPLETED" || shift.status === "CANCELLED") {
    return { error: "Cannot clock in to a completed or cancelled shift." };
  }
  await db.shift.update({
    where: { id: shift.id },
    data: { actualStart: new Date(), status: "IN_PROGRESS" },
  });
  revalidatePath(`/provider/shifts/${shiftId}`);
  revalidatePath("/provider/shifts");
  revalidatePath("/provider/roster");
  return { ok: true };
}

export async function clockOutAction(shiftId: string) {
  const { shift } = await loadShift(shiftId);
  if (!shift) return { error: "Shift not found." };
  if (shift.status !== "IN_PROGRESS") {
    return { error: "Clock in before clocking out." };
  }
  // Q4 paperwork-friction #1: progress notes get skipped post-shift due to
  // fatigue. Hard-gate clock-out on having at least one note. If the shift
  // was genuinely uneventful, the worker can write a one-liner saying so.
  const noteCount = await db.progressNote.count({
    where: { shiftId: shift.id },
  });
  if (noteCount === 0) {
    return {
      error:
        "Add at least one progress note before clocking out. If nothing happened, a one-line note saying so is fine.",
    };
  }
  await db.shift.update({
    where: { id: shift.id },
    data: { actualEnd: new Date(), status: "COMPLETED" },
  });
  revalidatePath(`/provider/shifts/${shiftId}`);
  revalidatePath("/provider/shifts");
  revalidatePath("/provider/roster");
  return { ok: true };
}

const noteSchema = z.object({
  body: z.string().trim().min(1, "Note can't be empty."),
  isHandover: z.string().optional(),
});

export type AddNoteState = {
  error?: string;
  fieldErrors?: { body?: string };
  ok?: boolean;
};

export async function addProgressNoteAction(
  shiftId: string,
  _prev: AddNoteState,
  formData: FormData
): Promise<AddNoteState> {
  const { shift } = await loadShift(shiftId);
  if (!shift) return { error: "Shift not found." };

  const parsed = noteSchema.safeParse({
    body: formData.get("body"),
    isHandover: formData.get("isHandover") ?? undefined,
  });
  if (!parsed.success) {
    return {
      fieldErrors: { body: parsed.error.issues[0]?.message ?? "Invalid." },
    };
  }

  const isHandover =
    parsed.data.isHandover === "on" || parsed.data.isHandover === "true";

  const session = await auth();
  await db.progressNote.create({
    data: {
      shiftId: shift.id,
      authorId: session?.user?.id ?? null,
      body: parsed.data.body,
      isHandover,
    },
  });

  revalidatePath(`/provider/shifts/${shiftId}`);
  return { ok: true };
}

const MEDICATION_STATUS = [
  "GIVEN",
  "REFUSED",
  "UNAVAILABLE",
  "OUT_OF_STOCK",
  "FORGOTTEN",
  "CLINICAL_HOLD",
  "OTHER",
] as const;

const marSchema = z
  .object({
    medication: z.string().trim().min(1, "Medication name is required."),
    dose: z.string().trim().optional().or(z.literal("")),
    givenAt: z.string().min(1, "Time is required."),
    notes: z.string().trim().optional().or(z.literal("")),
    status: z.enum(MEDICATION_STATUS).default("GIVEN"),
    missedReason: z.string().trim().optional().or(z.literal("")),
    isPrn: z.string().optional(),
    prnReason: z.string().trim().optional().or(z.literal("")),
    prnOutcome: z.string().trim().optional().or(z.literal("")),
  })
  .superRefine((d, ctx) => {
    // Free-text reason is required when status = OTHER; optional otherwise.
    if (d.status === "OTHER" && !d.missedReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["missedReason"],
        message: "Please describe what happened.",
      });
    }
    // If the dose was given via PRN, the reason for giving it is required.
    // Outcome can be left blank — it gets filled in later once the
    // medication takes effect.
    const prn = d.isPrn === "on" || d.isPrn === "true";
    if (prn && d.status === "GIVEN" && !d.prnReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["prnReason"],
        message: "Why was the PRN dose given?",
      });
    }
  });

type MarFieldKey =
  | "medication"
  | "dose"
  | "givenAt"
  | "notes"
  | "status"
  | "missedReason"
  | "prnReason"
  | "prnOutcome";

export type AddMarState = {
  error?: string;
  fieldErrors?: Partial<Record<MarFieldKey, string>>;
  ok?: boolean;
};

export async function addMarAction(
  shiftId: string,
  _prev: AddMarState,
  formData: FormData
): Promise<AddMarState> {
  const { shift } = await loadShift(shiftId);
  if (!shift) return { error: "Shift not found." };

  // Several of these only render conditionally — `?? undefined` so the
  // zod schema treats them as missing (i.e. optional) rather than `null`
  // (which it rejects). Same fix as the signup hybrid second-org fields.
  const parsed = marSchema.safeParse({
    medication: formData.get("medication") ?? undefined,
    dose: formData.get("dose") ?? undefined,
    givenAt: formData.get("givenAt") ?? undefined,
    notes: formData.get("notes") ?? undefined,
    status: formData.get("status") || "GIVEN",
    missedReason: formData.get("missedReason") ?? undefined,
    isPrn: formData.get("isPrn") ?? undefined,
    prnReason: formData.get("prnReason") ?? undefined,
    prnOutcome: formData.get("prnOutcome") ?? undefined,
  });
  if (!parsed.success) {
    const fieldErrors: AddMarState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]) as MarFieldKey;
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const data = parsed.data;
  const givenAt = new Date(data.givenAt);
  if (Number.isNaN(givenAt.getTime())) {
    return { fieldErrors: { givenAt: "Invalid time." } };
  }

  const isPrn = data.isPrn === "on" || data.isPrn === "true";
  const session = await auth();
  await db.medicationRecord.create({
    data: {
      shiftId: shift.id,
      medication: data.medication,
      dose: data.dose || null,
      givenAt,
      givenById: session?.user?.id ?? null,
      notes: data.notes || null,
      status: data.status,
      missedReason: data.missedReason || null,
      isPrn,
      // Only persist PRN justification when the dose was actually given —
      // a refused PRN doesn't need a reason for giving it.
      prnReason: isPrn && data.status === "GIVEN" ? data.prnReason || null : null,
      prnOutcome: isPrn && data.status === "GIVEN" ? data.prnOutcome || null : null,
    },
  });

  revalidatePath(`/provider/shifts/${shiftId}`);
  return { ok: true };
}

// ─── Quick-log incident ────────────────────────────────────────────────
//
// Q4 paperwork-friction #4 (2026-05-11): small incidents get skipped
// because the full reportable-incident form is heavy. This carves out a
// 10-second path: severity + description, everything else inferred from
// the shift. Worker can promote to the full flow later.

const quickIncidentSchema = z.object({
  severity: z.enum(["MINOR", "MODERATE"]),
  description: z
    .string()
    .trim()
    .min(5, "A short description is required."),
});

export type QuickIncidentState = {
  error?: string;
  fieldErrors?: Partial<Record<"severity" | "description", string>>;
  ok?: boolean;
};

export async function quickLogIncidentAction(
  shiftId: string,
  _prev: QuickIncidentState,
  formData: FormData
): Promise<QuickIncidentState> {
  const { context, shift } = await loadShift(shiftId);
  if (!shift) return { error: "Shift not found." };

  const parsed = quickIncidentSchema.safeParse({
    severity: formData.get("severity"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    const fieldErrors: QuickIncidentState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]) as keyof typeof fieldErrors;
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const session = await auth();
  await db.incident.create({
    data: {
      orgId: context.activeOrg.id,
      participantId: shift.participantId,
      shiftId: shift.id,
      occurredAt: new Date(),
      severity: parsed.data.severity,
      status: "DRAFT",
      description: parsed.data.description,
      createdById: session?.user?.id ?? null,
    },
  });

  revalidatePath(`/provider/shifts/${shiftId}`);
  revalidatePath("/provider/incidents");
  return { ok: true };
}

// ─── Restraint log ─────────────────────────────────────────────────────
//
// Provider Scene D compliance iceberg #4. Logged at the shift level so the
// worker can capture it in the moment; managers see it on the participant
// page for audit prep.

const restraintTypeEnum = z.enum([
  "PHYSICAL",
  "MECHANICAL",
  "CHEMICAL",
  "ENVIRONMENTAL",
  "SECLUSION",
]);

const restraintSchema = z.object({
  type: restraintTypeEnum,
  usedAt: z.string().min(1, "Time is required."),
  durationMinutes: z.string().optional().or(z.literal("")),
  reason: z.string().trim().min(5, "Why was the restraint used?"),
  outcome: z.string().trim().optional().or(z.literal("")),
});

export type LogRestraintState = {
  error?: string;
  fieldErrors?: Partial<
    Record<"type" | "usedAt" | "durationMinutes" | "reason" | "outcome", string>
  >;
  ok?: boolean;
  /**
   * Populated when there was no active BSP at the time of the restraint
   * — the system auto-created a reportable incident (Q3 from the
   * 2026-05-12 client batch). The UI surfaces a follow-up CTA.
   */
  autoIncidentId?: string;
};

export async function logRestraintAction(
  shiftId: string,
  _prev: LogRestraintState,
  formData: FormData
): Promise<LogRestraintState> {
  const { context, shift } = await loadShift(shiftId);
  if (!shift) return { error: "Shift not found." };

  const parsed = restraintSchema.safeParse({
    type: formData.get("type"),
    usedAt: formData.get("usedAt"),
    durationMinutes: formData.get("durationMinutes"),
    reason: formData.get("reason"),
    outcome: formData.get("outcome"),
  });
  if (!parsed.success) {
    const fieldErrors: LogRestraintState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]) as keyof typeof fieldErrors;
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const usedAt = new Date(parsed.data.usedAt);
  if (Number.isNaN(usedAt.getTime())) {
    return { fieldErrors: { usedAt: "Invalid time." } };
  }

  // Snapshot the currently-active BSP id for the audit trail.
  const activeBSP = await db.behaviourSupportPlan.findFirst({
    where: {
      participantId: shift.participantId,
      orgId: context.activeOrg.id,
      status: "ACTIVE",
    },
    select: { id: true },
  });

  const duration = parsed.data.durationMinutes
    ? Number.parseInt(parsed.data.durationMinutes, 10)
    : null;

  const session = await auth();

  // Q3 (2026-05-12): a restrictive practice without an authorised BSP is
  // already a reportable incident under NDIS Commission rules. Detect it,
  // create the Incident record, and start the statutory countdown so the
  // provider can respond. We do NOT auto-file with the Commission —
  // filing is a human decision; the admin can either file the report or
  // update the BSP to authorise the restraint retroactively if
  // clinically appropriate.
  const autoIncidentNeeded = !activeBSP;

  let autoIncidentId: string | null = null;
  await db.$transaction(async (tx) => {
    const restraint = await tx.restraintRecord.create({
      data: {
        orgId: context.activeOrg.id,
        participantId: shift.participantId,
        shiftId: shift.id,
        type: parsed.data.type,
        usedAt,
        durationMinutes:
          duration !== null && !Number.isNaN(duration) ? duration : null,
        reason: parsed.data.reason,
        outcome: parsed.data.outcome || null,
        createdById: session?.user?.id ?? null,
        authorisedById: session?.user?.id ?? null,
        bspIdAtTime: activeBSP?.id ?? null,
      },
    });

    if (autoIncidentNeeded) {
      const incident = await tx.incident.create({
        data: {
          orgId: context.activeOrg.id,
          participantId: shift.participantId,
          shiftId: shift.id,
          occurredAt: usedAt,
          // Start the 24h clock at the moment of restraint use.
          reportedAt: new Date(),
          severity: "REPORTABLE",
          status: "DRAFT",
          description:
            `Auto-flagged: ${parsed.data.type.toLowerCase()} restraint used without an active Behaviour Support Plan. ` +
            `Restraint reason: ${parsed.data.reason}. ` +
            `Either file the reportable incident with NDIS or update / create the BSP to authorise this restraint retroactively.`,
          immediateActions: parsed.data.outcome || null,
          createdById: session?.user?.id ?? null,
        },
      });
      autoIncidentId = incident.id;
      // Reference the restraint for future audit chain.
      void restraint;
    }
  });

  revalidatePath(`/provider/shifts/${shiftId}`);
  revalidatePath(`/provider/participants/${shift.participantId}`);
  if (autoIncidentId) {
    revalidatePath("/provider/incidents");
    // Q4 (2026-05-12): the auto-created incident is by definition
    // reportable — fan out to email + SMS the same way a manually-logged
    // reportable incident would.
    void dispatchNotification({
      type: "incident.reportable",
      orgId: context.activeOrg.id,
      participantId: shift.participantId,
      incidentId: autoIncidentId,
      summary: `${parsed.data.type.toLowerCase()} restraint used without an active Behaviour Support Plan. Reason: ${parsed.data.reason.slice(0, 200)}`,
    });
  }
  return {
    ok: true,
    autoIncidentId: autoIncidentId ?? undefined,
  };
}