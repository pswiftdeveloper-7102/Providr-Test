"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import { assertCoordinator } from "@/lib/rbac";

const escalationTypeEnum = z.enum([
  "PROVIDER_DROP",
  "HOSPITAL",
  "REPORTABLE_INCIDENT",
  "FAMILY_ISSUE",
  "EMERGENCY_COVER",
  "PLAN_BREACH",
  "OTHER",
]);

const escalationStatusEnum = z.enum(["OPEN", "IN_PROGRESS", "RESOLVED"]);

const createSchema = z.object({
  participantId: z.string().min(1, "Pick a participant."),
  type: escalationTypeEnum,
  description: z
    .string()
    .trim()
    .min(5, "Describe what happened (5+ characters)."),
});

const updateSchema = z.object({
  status: escalationStatusEnum,
  resolution: z.string().trim().optional().or(z.literal("")),
});

export type EscalationFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function createEscalationAction(
  _prev: EscalationFormState,
  formData: FormData
): Promise<EscalationFormState> {
  const context = await resolvePortalContext("sc");
  assertCoordinator(context);

  const parsed = createSchema.safeParse({
    participantId: formData.get("participantId"),
    type: formData.get("type"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const participant = await db.participant.findFirst({
    where: {
      id: parsed.data.participantId,
      orgId: context.activeOrg.id,
    },
    select: { id: true },
  });
  if (!participant) return { error: "Participant not found." };

  const session = await auth();
  await db.escalation.create({
    data: {
      orgId: context.activeOrg.id,
      participantId: participant.id,
      type: parsed.data.type,
      description: parsed.data.description,
      createdById: session?.user?.id ?? null,
    },
  });

  revalidatePath("/sc/escalations");
  revalidatePath(`/sc/participants/${participant.id}`);
  redirect("/sc/escalations");
}

export async function updateEscalationAction(
  escalationId: string,
  _prev: EscalationFormState,
  formData: FormData
): Promise<EscalationFormState> {
  const context = await resolvePortalContext("sc");
  assertCoordinator(context);

  const existing = await db.escalation.findFirst({
    where: { id: escalationId, orgId: context.activeOrg.id },
    select: { id: true, participantId: true },
  });
  if (!existing) return { error: "Escalation not found." };

  const parsed = updateSchema.safeParse({
    status: formData.get("status"),
    resolution: formData.get("resolution"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  await db.escalation.update({
    where: { id: existing.id },
    data: {
      status: parsed.data.status,
      resolution: parsed.data.resolution || null,
      resolvedAt: parsed.data.status === "RESOLVED" ? new Date() : null,
    },
  });

  revalidatePath("/sc/escalations");
  revalidatePath(`/sc/participants/${existing.participantId}`);
  return {};
}