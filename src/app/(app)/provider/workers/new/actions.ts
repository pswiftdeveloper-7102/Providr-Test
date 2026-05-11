"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import { assertManager } from "@/lib/rbac";

const createWorkerSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().min(1, "Last name is required."),
  email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  type: z
    .enum(["SUPPORT_WORKER", "ALLIED_HEALTH", "BEHAVIOUR_SUPPORT"])
    .default("SUPPORT_WORKER"),
  ndisWorkerCheckExpiry: z.string().trim().optional().or(z.literal("")),
  firstAidExpiry: z.string().trim().optional().or(z.literal("")),
});

export type CreateWorkerState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function createWorkerAction(
  _prev: CreateWorkerState,
  formData: FormData
): Promise<CreateWorkerState> {
  const context = await resolvePortalContext("provider");
  assertManager(context);

  const parsed = createWorkerSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    type: formData.get("type") ?? undefined,
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
  const created = await db.worker.create({
    data: {
      orgId: context.activeOrg.id,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email || null,
      phone: data.phone || null,
      type: data.type,
      ndisWorkerCheckExpiry: data.ndisWorkerCheckExpiry
        ? new Date(data.ndisWorkerCheckExpiry)
        : null,
      firstAidExpiry: data.firstAidExpiry
        ? new Date(data.firstAidExpiry)
        : null,
    },
  });

  revalidatePath("/provider/workers");
  redirect(`/provider/workers/${created.id}`);
}