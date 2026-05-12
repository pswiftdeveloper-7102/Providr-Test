"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import { assertCoordinator } from "@/lib/rbac";

// ─── Informal supports (Scene A — family etc.) ─────────────────────────

const informalRelationshipEnum = z.enum([
  "FAMILY",
  "FRIEND",
  "GUARDIAN",
  "ADVOCATE",
  "OTHER",
]);

const informalSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  relationship: informalRelationshipEnum,
  phone: z.string().trim().optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("Invalid email")
    .optional()
    .or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
  isPrimary: z.string().optional(),
});

export type InformalSupportState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
};

async function requireParticipant(participantId: string, orgId: string) {
  return db.participant.findFirst({
    where: { id: participantId, orgId },
    select: { id: true },
  });
}

export async function addInformalSupportAction(
  participantId: string,
  _prev: InformalSupportState,
  formData: FormData
): Promise<InformalSupportState> {
  const context = await resolvePortalContext("sc");
  assertCoordinator(context);

  const participant = await requireParticipant(
    participantId,
    context.activeOrg.id
  );
  if (!participant) return { error: "Participant not found." };

  const parsed = informalSchema.safeParse({
    name: formData.get("name"),
    relationship: formData.get("relationship"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    notes: formData.get("notes"),
    isPrimary: formData.get("isPrimary") ?? undefined,
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const isPrimary =
    parsed.data.isPrimary === "on" || parsed.data.isPrimary === "true";

  await db.informalSupport.create({
    data: {
      participantId: participant.id,
      name: parsed.data.name,
      relationship: parsed.data.relationship,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      notes: parsed.data.notes || null,
      isPrimary,
    },
  });

  revalidatePath(`/sc/participants/${participantId}`);
  return { ok: true };
}

export async function deleteInformalSupportAction(supportId: string) {
  const context = await resolvePortalContext("sc");
  assertCoordinator(context);

  const support = await db.informalSupport.findFirst({
    where: {
      id: supportId,
      participant: { orgId: context.activeOrg.id },
    },
    select: { id: true, participantId: true },
  });
  if (!support) return;

  await db.informalSupport.delete({ where: { id: support.id } });
  revalidatePath(`/sc/participants/${support.participantId}`);
}

// ─── External contacts (Scene A — NDIA, GP, hospital, etc.) ────────────

const externalContactTypeEnum = z.enum([
  "NDIA_PLANNER",
  "PLAN_MANAGER",
  "GP",
  "HOSPITAL",
  "ALLIED_HEALTH",
  "MENTAL_HEALTH",
  "HOUSING",
  "EDUCATION",
  "OTHER",
]);

const externalContactSchema = z.object({
  type: externalContactTypeEnum,
  organisationName: z.string().trim().optional().or(z.literal("")),
  contactName: z.string().trim().optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("Invalid email")
    .optional()
    .or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
});

export type ExternalContactState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
};

export async function addExternalContactAction(
  participantId: string,
  _prev: ExternalContactState,
  formData: FormData
): Promise<ExternalContactState> {
  const context = await resolvePortalContext("sc");
  assertCoordinator(context);

  const participant = await requireParticipant(
    participantId,
    context.activeOrg.id
  );
  if (!participant) return { error: "Participant not found." };

  const parsed = externalContactSchema.safeParse({
    type: formData.get("type"),
    organisationName: formData.get("organisationName"),
    contactName: formData.get("contactName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  await db.externalContact.create({
    data: {
      participantId: participant.id,
      type: parsed.data.type,
      organisationName: parsed.data.organisationName || null,
      contactName: parsed.data.contactName || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      notes: parsed.data.notes || null,
    },
  });

  revalidatePath(`/sc/participants/${participantId}`);
  return { ok: true };
}

export async function deleteExternalContactAction(contactId: string) {
  const context = await resolvePortalContext("sc");
  assertCoordinator(context);

  const contact = await db.externalContact.findFirst({
    where: {
      id: contactId,
      participant: { orgId: context.activeOrg.id },
    },
    select: { id: true, participantId: true },
  });
  if (!contact) return;

  await db.externalContact.delete({ where: { id: contact.id } });
  revalidatePath(`/sc/participants/${contact.participantId}`);
}