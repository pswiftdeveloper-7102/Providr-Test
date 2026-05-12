"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import { assertManager } from "@/lib/rbac";

const bspSchema = z.object({
  effectiveFrom: z.string().optional().or(z.literal("")),
  effectiveTo: z.string().optional().or(z.literal("")),
  authoredById: z.string().optional().or(z.literal("")),
  summary: z.string().trim().optional().or(z.literal("")),
  triggers: z.string().trim().optional().or(z.literal("")),
  deescalation: z.string().trim().optional().or(z.literal("")),
  whatNotToDo: z.string().trim().optional().or(z.literal("")),
});

export type BSPFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function parseForm(formData: FormData) {
  return bspSchema.safeParse({
    effectiveFrom: formData.get("effectiveFrom"),
    effectiveTo: formData.get("effectiveTo"),
    authoredById: formData.get("authoredById"),
    summary: formData.get("summary"),
    triggers: formData.get("triggers"),
    deescalation: formData.get("deescalation"),
    whatNotToDo: formData.get("whatNotToDo"),
  });
}

function fieldsToData(data: z.infer<typeof bspSchema>) {
  return {
    effectiveFrom: data.effectiveFrom ? new Date(data.effectiveFrom) : null,
    effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null,
    authoredById: data.authoredById || null,
    summary: data.summary || null,
    triggers: data.triggers || null,
    deescalation: data.deescalation || null,
    whatNotToDo: data.whatNotToDo || null,
  };
}

export async function createBSPAction(
  participantId: string,
  _prev: BSPFormState,
  formData: FormData
): Promise<BSPFormState> {
  const context = await resolvePortalContext("provider");
  assertManager(context);

  const participant = await db.participant.findFirst({
    where: { id: participantId, orgId: context.activeOrg.id },
    select: { id: true },
  });
  if (!participant) return { error: "Participant not found." };

  const parsed = parseForm(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  await db.behaviourSupportPlan.create({
    data: {
      orgId: context.activeOrg.id,
      participantId,
      status: "ACTIVE",
      ...fieldsToData(parsed.data),
    },
  });

  revalidatePath(`/provider/participants/${participantId}`);
  redirect(`/provider/participants/${participantId}`);
}

export async function updateBSPAction(
  bspId: string,
  _prev: BSPFormState,
  formData: FormData
): Promise<BSPFormState> {
  const context = await resolvePortalContext("provider");
  assertManager(context);

  const bsp = await db.behaviourSupportPlan.findFirst({
    where: { id: bspId, orgId: context.activeOrg.id },
    select: { id: true, participantId: true },
  });
  if (!bsp) return { error: "BSP not found." };

  const parsed = parseForm(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  await db.behaviourSupportPlan.update({
    where: { id: bsp.id },
    data: fieldsToData(parsed.data),
  });

  revalidatePath(`/provider/participants/${bsp.participantId}`);
  redirect(`/provider/participants/${bsp.participantId}`);
}