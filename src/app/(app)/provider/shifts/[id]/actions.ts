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

  const parsed = noteSchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) {
    return {
      fieldErrors: { body: parsed.error.issues[0]?.message ?? "Invalid." },
    };
  }

  const session = await auth();
  await db.progressNote.create({
    data: {
      shiftId: shift.id,
      authorId: session?.user?.id ?? null,
      body: parsed.data.body,
    },
  });

  revalidatePath(`/provider/shifts/${shiftId}`);
  return { ok: true };
}

const marSchema = z.object({
  medication: z.string().trim().min(1, "Medication name is required."),
  dose: z.string().trim().optional().or(z.literal("")),
  givenAt: z.string().min(1, "Time is required."),
  notes: z.string().trim().optional().or(z.literal("")),
});

export type AddMarState = {
  error?: string;
  fieldErrors?: Partial<Record<"medication" | "dose" | "givenAt" | "notes", string>>;
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
  });
  if (!parsed.success) {
    const fieldErrors: AddMarState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]) as keyof typeof fieldErrors;
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const data = parsed.data;
  const givenAt = new Date(data.givenAt);
  if (Number.isNaN(givenAt.getTime())) {
    return { fieldErrors: { givenAt: "Invalid time." } };
  }

  const session = await auth();
  await db.medicationRecord.create({
    data: {
      shiftId: shift.id,
      medication: data.medication,
      dose: data.dose || null,
      givenAt,
      givenById: session?.user?.id ?? null,
      notes: data.notes || null,
    },
  });

  revalidatePath(`/provider/shifts/${shiftId}`);
  return { ok: true };
}