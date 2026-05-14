"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { resolveWorkerContext } from "@/lib/session";

// PWA progress-note action. Clock-in/out is NOT part of the PWA MVP —
// the Worker App is "incident logging + read the plan + write notes".
// If clock controls return later, mirror the /worker portal action.

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
  const context = await resolveWorkerContext();
  const shift = await db.shift.findFirst({
    where: { id: shiftId, workerId: context.worker.id },
    select: { id: true },
  });
  if (!shift) {
    return { error: "Shift not found." };
  }

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
  revalidatePath(`/app/shifts/${shift.id}`);
  revalidatePath("/app/shifts");
  return { ok: true };
}