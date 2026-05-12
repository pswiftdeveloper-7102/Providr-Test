"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import { assertManager } from "@/lib/rbac";

const updateWorkerSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().min(1, "Last name is required."),
  email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  ndisWorkerCheckExpiry: z.string().trim().optional().or(z.literal("")),
  firstAidExpiry: z.string().trim().optional().or(z.literal("")),
});

export type UpdateWorkerState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
};

export async function updateWorkerAction(
  workerId: string,
  _prev: UpdateWorkerState,
  formData: FormData
): Promise<UpdateWorkerState> {
  const context = await resolvePortalContext("provider");
  assertManager(context);

  const worker = await db.worker.findFirst({
    where: { id: workerId, orgId: context.activeOrg.id },
    select: { id: true },
  });
  if (!worker) return { error: "Worker not found." };

  const parsed = updateWorkerSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    ndisWorkerCheckExpiry: formData.get("ndisWorkerCheckExpiry"),
    firstAidExpiry: formData.get("firstAidExpiry"),
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
  await db.worker.update({
    where: { id: workerId },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email || null,
      phone: data.phone || null,
      ndisWorkerCheckExpiry: data.ndisWorkerCheckExpiry
        ? new Date(data.ndisWorkerCheckExpiry)
        : null,
      firstAidExpiry: data.firstAidExpiry
        ? new Date(data.firstAidExpiry)
        : null,
    },
  });

  revalidatePath(`/provider/workers/${workerId}`);
  revalidatePath("/provider/workers");
  return { ok: true };
}

export async function deleteWorkerAction(workerId: string) {
  const context = await resolvePortalContext("provider");
  assertManager(context);

  const worker = await db.worker.findFirst({
    where: { id: workerId, orgId: context.activeOrg.id },
    select: { id: true },
  });
  if (!worker) return;

  await db.worker.delete({ where: { id: workerId } });
  revalidatePath("/provider/workers");
  redirect("/provider/workers");
}

// ─── Training records ──────────────────────────────────────────────────
//
// Provider Scene D compliance iceberg #5. Separate from cert expiry (which
// is a hard rostering gate) — this is the longer tail of ongoing training
// the org tracks for audit prep.

const trainingSchema = z.object({
  title: z.string().trim().min(1, "What was the training?"),
  provider: z.string().trim().optional().or(z.literal("")),
  completedAt: z.string().min(1, "Completion date is required."),
  expiresAt: z.string().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
});

export type AddTrainingState = {
  error?: string;
  fieldErrors?: Partial<
    Record<"title" | "provider" | "completedAt" | "expiresAt" | "notes", string>
  >;
  ok?: boolean;
};

export async function addTrainingAction(
  workerId: string,
  _prev: AddTrainingState,
  formData: FormData
): Promise<AddTrainingState> {
  const context = await resolvePortalContext("provider");
  assertManager(context);

  const worker = await db.worker.findFirst({
    where: { id: workerId, orgId: context.activeOrg.id },
    select: { id: true },
  });
  if (!worker) return { error: "Worker not found." };

  const parsed = trainingSchema.safeParse({
    title: formData.get("title"),
    provider: formData.get("provider"),
    completedAt: formData.get("completedAt"),
    expiresAt: formData.get("expiresAt"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    const fieldErrors: AddTrainingState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]) as keyof typeof fieldErrors;
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  await db.trainingRecord.create({
    data: {
      orgId: context.activeOrg.id,
      workerId: worker.id,
      title: parsed.data.title,
      provider: parsed.data.provider || null,
      completedAt: new Date(parsed.data.completedAt),
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      notes: parsed.data.notes || null,
    },
  });

  revalidatePath(`/provider/workers/${workerId}`);
  return { ok: true };
}

export async function deleteTrainingAction(trainingId: string) {
  const context = await resolvePortalContext("provider");
  assertManager(context);

  const record = await db.trainingRecord.findFirst({
    where: { id: trainingId, orgId: context.activeOrg.id },
    select: { id: true, workerId: true },
  });
  if (!record) return;

  await db.trainingRecord.delete({ where: { id: record.id } });
  revalidatePath(`/provider/workers/${record.workerId}`);
}