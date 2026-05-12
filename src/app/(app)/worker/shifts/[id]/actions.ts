"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { resolveWorkerContext } from "@/lib/session";

// Q8 (2026-05-12): mobile clock-in/out with location, and progress notes
// optionally captured via the browser SpeechRecognition API.

const clockSchema = z.object({
  lat: z.coerce.number().min(-90).max(90).nullable().optional(),
  lng: z.coerce.number().min(-180).max(180).nullable().optional(),
  accuracyM: z.coerce.number().min(0).nullable().optional(),
});

export type ClockState = {
  error?: string;
  ok?: boolean;
};

async function ensureOwnShift(shiftId: string) {
  const context = await resolveWorkerContext();
  const shift = await db.shift.findFirst({
    where: { id: shiftId, workerId: context.worker.id },
    select: {
      id: true,
      status: true,
      orgId: true,
      actualStart: true,
      actualEnd: true,
    },
  });
  if (!shift) {
    throw new Error("Shift not found.");
  }
  return { context, shift };
}

function parseGeo(formData: FormData) {
  return clockSchema.safeParse({
    lat: formData.get("lat") || null,
    lng: formData.get("lng") || null,
    accuracyM: formData.get("accuracyM") || null,
  });
}

export async function clockInAction(
  shiftId: string,
  _prev: ClockState,
  formData: FormData
): Promise<ClockState> {
  const { shift } = await ensureOwnShift(shiftId);
  if (shift.status !== "SCHEDULED") {
    return { error: "This shift has already been started." };
  }
  const geo = parseGeo(formData);
  const data = geo.success ? geo.data : {};
  const now = new Date();
  await db.shift.update({
    where: { id: shift.id },
    data: {
      status: "IN_PROGRESS",
      actualStart: now,
      clockInLat: data.lat ?? null,
      clockInLng: data.lng ?? null,
      clockInAccuracyM: data.accuracyM ?? null,
    },
  });
  revalidatePath(`/worker/shifts/${shift.id}`);
  revalidatePath("/worker");
  return { ok: true };
}

export async function clockOutAction(
  shiftId: string,
  _prev: ClockState,
  formData: FormData
): Promise<ClockState> {
  const { shift } = await ensureOwnShift(shiftId);
  if (shift.status !== "IN_PROGRESS") {
    return { error: "This shift isn't in progress." };
  }
  const geo = parseGeo(formData);
  const data = geo.success ? geo.data : {};
  const now = new Date();
  await db.shift.update({
    where: { id: shift.id },
    data: {
      status: "COMPLETED",
      actualEnd: now,
      clockOutLat: data.lat ?? null,
      clockOutLng: data.lng ?? null,
      clockOutAccuracyM: data.accuracyM ?? null,
    },
  });
  revalidatePath(`/worker/shifts/${shift.id}`);
  revalidatePath("/worker");
  return { ok: true };
}

const progressNoteSchema = z.object({
  body: z.string().trim().min(2, "Note can't be empty."),
  isHandover: z.string().optional(),
  inputMethod: z.enum(["KEYBOARD", "VOICE"]).default("KEYBOARD"),
});

export type ProgressNoteState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
};

export async function addProgressNoteAction(
  shiftId: string,
  _prev: ProgressNoteState,
  formData: FormData
): Promise<ProgressNoteState> {
  const { context, shift } = await ensureOwnShift(shiftId);
  const parsed = progressNoteSchema.safeParse({
    body: formData.get("body") ?? "",
    isHandover: formData.get("isHandover") ?? undefined,
    inputMethod: formData.get("inputMethod") ?? "KEYBOARD",
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }
  await db.progressNote.create({
    data: {
      shiftId: shift.id,
      authorId: context.user.id,
      body: parsed.data.body,
      isHandover:
        parsed.data.isHandover === "on" || parsed.data.isHandover === "true",
      inputMethod: parsed.data.inputMethod,
    },
  });
  revalidatePath(`/worker/shifts/${shift.id}`);
  return { ok: true };
}