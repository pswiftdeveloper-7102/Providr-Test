"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import { assertManager } from "@/lib/rbac";

// Shared schema for create + update — every field is optional so the form
// can be progressively filled. Edit mode just replaces with whatever the
// user submitted; empty fields become null.
const carePlanSchema = z.object({
  effectiveFrom: z.string().optional().or(z.literal("")),
  effectiveTo: z.string().optional().or(z.literal("")),
  summary: z.string().trim().optional().or(z.literal("")),
  communicationPreferences: z.string().trim().optional().or(z.literal("")),
  medicalConditions: z.string().trim().optional().or(z.literal("")),
  allergies: z.string().trim().optional().or(z.literal("")),
  risks: z.string().trim().optional().or(z.literal("")),
  emergencyContacts: z.string().trim().optional().or(z.literal("")),
  culturalConsiderations: z.string().trim().optional().or(z.literal("")),
});

export type CarePlanFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

// Back-compat alias — older code may still import this name.
export type CreateCarePlanState = CarePlanFormState;

function parseForm(formData: FormData) {
  return carePlanSchema.safeParse({
    effectiveFrom: formData.get("effectiveFrom"),
    effectiveTo: formData.get("effectiveTo"),
    summary: formData.get("summary"),
    communicationPreferences: formData.get("communicationPreferences"),
    medicalConditions: formData.get("medicalConditions"),
    allergies: formData.get("allergies"),
    risks: formData.get("risks"),
    emergencyContacts: formData.get("emergencyContacts"),
    culturalConsiderations: formData.get("culturalConsiderations"),
  });
}

function fieldsToData(data: z.infer<typeof carePlanSchema>) {
  return {
    effectiveFrom: data.effectiveFrom ? new Date(data.effectiveFrom) : null,
    effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null,
    summary: data.summary || null,
    communicationPreferences: data.communicationPreferences || null,
    medicalConditions: data.medicalConditions || null,
    allergies: data.allergies || null,
    risks: data.risks || null,
    emergencyContacts: data.emergencyContacts || null,
    culturalConsiderations: data.culturalConsiderations || null,
  };
}

export async function createCarePlanAction(
  participantId: string,
  _prev: CarePlanFormState,
  formData: FormData
): Promise<CarePlanFormState> {
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

  await db.carePlan.create({
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

export async function updateCarePlanAction(
  carePlanId: string,
  _prev: CarePlanFormState,
  formData: FormData
): Promise<CarePlanFormState> {
  const context = await resolvePortalContext("provider");
  assertManager(context);

  const carePlan = await db.carePlan.findFirst({
    where: { id: carePlanId, orgId: context.activeOrg.id },
    select: { id: true, participantId: true },
  });
  if (!carePlan) return { error: "Care plan not found." };

  const parsed = parseForm(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  await db.carePlan.update({
    where: { id: carePlan.id },
    data: fieldsToData(parsed.data),
  });

  revalidatePath(`/provider/participants/${carePlan.participantId}`);
  redirect(`/provider/participants/${carePlan.participantId}`);
}

// ─── Goal actions ──────────────────────────────────────────────────────

const goalCategoryEnum = z.enum([
  "SOCIAL",
  "PHYSICAL",
  "COMMUNICATION",
  "INDEPENDENT_LIVING",
  "COMMUNITY_PARTICIPATION",
  "EMPLOYMENT",
  "OTHER",
]);

const goalStatusEnum = z.enum([
  "IN_PROGRESS",
  "ACHIEVED",
  "PAUSED",
  "DROPPED",
]);

const addGoalSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  description: z.string().trim().optional().or(z.literal("")),
  category: goalCategoryEnum,
  targetDate: z.string().optional().or(z.literal("")),
});

export type AddGoalState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
};

export async function addGoalAction(
  carePlanId: string,
  _prev: AddGoalState,
  formData: FormData
): Promise<AddGoalState> {
  const context = await resolvePortalContext("provider");
  assertManager(context);

  const carePlan = await db.carePlan.findFirst({
    where: { id: carePlanId, orgId: context.activeOrg.id },
    select: { id: true, participantId: true },
  });
  if (!carePlan) return { error: "Care plan not found." };

  const parsed = addGoalSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category"),
    targetDate: formData.get("targetDate"),
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

  await db.goal.create({
    data: {
      carePlanId: carePlan.id,
      title: data.title,
      description: data.description || null,
      category: data.category,
      targetDate: data.targetDate ? new Date(data.targetDate) : null,
    },
  });

  revalidatePath(`/provider/participants/${carePlan.participantId}`);
  return { ok: true };
}

export async function updateGoalStatusAction(
  goalId: string,
  status: string
) {
  const context = await resolvePortalContext("provider");
  assertManager(context);

  const parsed = goalStatusEnum.safeParse(status);
  if (!parsed.success) return { error: "Invalid status." };

  const goal = await db.goal.findFirst({
    where: {
      id: goalId,
      carePlan: { orgId: context.activeOrg.id },
    },
    include: { carePlan: { select: { participantId: true } } },
  });
  if (!goal || !goal.carePlan) return { error: "Goal not found." };

  await db.goal.update({
    where: { id: goalId },
    data: { status: parsed.data },
  });

  revalidatePath(`/provider/participants/${goal.carePlan.participantId}`);
  return { ok: true };
}