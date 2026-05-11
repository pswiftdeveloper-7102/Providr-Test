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