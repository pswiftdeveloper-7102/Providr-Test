"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";

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

  const parsed = marSchema.safeParse({
    medication: formData.get("medication"),
    dose: formData.get("dose"),
    givenAt: formData.get("givenAt"),
    notes: formData.get("notes"),
    status: formData.get("status") || "GIVEN",
    missedReason: formData.get("missedReason"),
    isPrn: formData.get("isPrn") ?? undefined,
    prnReason: formData.get("prnReason"),
    prnOutcome: formData.get("prnOutcome"),
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
  await db.restraintRecord.create({
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

  revalidatePath(`/provider/shifts/${shiftId}`);
  revalidatePath(`/provider/participants/${shift.participantId}`);
  return { ok: true };
}