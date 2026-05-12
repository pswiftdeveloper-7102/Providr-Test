"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import { assertCoordinator } from "@/lib/rbac";
import { dispatchNotification } from "@/lib/notifications/dispatch";

const engagementStatusEnum = z.enum([
  "PROPOSED",
  "AGREEMENT_SENT",
  "ACTIVE",
  "ENDED",
  "DECLINED",
]);

const engagementSchema = z.object({
  externalProviderId: z.string().min(1, "Pick a provider."),
  status: engagementStatusEnum,
  startedAt: z.string().optional().or(z.literal("")),
  endedAt: z.string().optional().or(z.literal("")),
  serviceSummary: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
});

export type EngagementFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function createEngagementAction(
  participantId: string,
  _prev: EngagementFormState,
  formData: FormData
): Promise<EngagementFormState> {
  const context = await resolvePortalContext("sc");
  assertCoordinator(context);

  const participant = await db.participant.findFirst({
    where: { id: participantId, orgId: context.activeOrg.id },
    select: { id: true },
  });
  if (!participant) return { error: "Participant not found." };

  const parsed = engagementSchema.safeParse({
    externalProviderId: formData.get("externalProviderId"),
    status: formData.get("status"),
    startedAt: formData.get("startedAt"),
    endedAt: formData.get("endedAt"),
    serviceSummary: formData.get("serviceSummary"),
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

  // Verify the provider belongs to this org.
  const provider = await db.externalProvider.findFirst({
    where: {
      id: parsed.data.externalProviderId,
      orgId: context.activeOrg.id,
    },
    select: { id: true },
  });
  if (!provider) return { error: "Provider not in your directory." };

  await db.scEngagement.create({
    data: {
      participantId: participant.id,
      externalProviderId: provider.id,
      status: parsed.data.status,
      startedAt: parsed.data.startedAt
        ? new Date(parsed.data.startedAt)
        : null,
      endedAt: parsed.data.endedAt ? new Date(parsed.data.endedAt) : null,
      serviceSummary: parsed.data.serviceSummary || null,
      notes: parsed.data.notes || null,
    },
  });

  revalidatePath(`/sc/participants/${participantId}`);
  revalidatePath(`/sc/providers/${provider.id}`);
  redirect(`/sc/participants/${participantId}`);
}

const updateEngagementSchema = z.object({
  status: engagementStatusEnum,
  startedAt: z.string().optional().or(z.literal("")),
  endedAt: z.string().optional().or(z.literal("")),
  serviceSummary: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
});

export async function updateEngagementAction(
  engagementId: string,
  _prev: EngagementFormState,
  formData: FormData
): Promise<EngagementFormState> {
  const context = await resolvePortalContext("sc");
  assertCoordinator(context);

  const existing = await db.scEngagement.findFirst({
    where: {
      id: engagementId,
      participant: { orgId: context.activeOrg.id },
    },
    select: {
      id: true,
      participantId: true,
      externalProviderId: true,
      status: true,
      participant: { select: { orgId: true } },
    },
  });
  if (!existing) return { error: "Engagement not found." };

  const parsed = updateEngagementSchema.safeParse({
    status: formData.get("status"),
    startedAt: formData.get("startedAt"),
    endedAt: formData.get("endedAt"),
    serviceSummary: formData.get("serviceSummary"),
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

  const wasActiveOrPending =
    existing.status === "ACTIVE" ||
    existing.status === "AGREEMENT_SENT" ||
    existing.status === "PROPOSED";

  await db.scEngagement.update({
    where: { id: existing.id },
    data: {
      status: parsed.data.status,
      startedAt: parsed.data.startedAt
        ? new Date(parsed.data.startedAt)
        : null,
      endedAt: parsed.data.endedAt ? new Date(parsed.data.endedAt) : null,
      serviceSummary: parsed.data.serviceSummary || null,
      notes: parsed.data.notes || null,
    },
  });

  // Q4 (2026-05-12): provider-drop fan-out when an active engagement
  // transitions to ENDED. Notification is best-effort and async.
  if (parsed.data.status === "ENDED" && wasActiveOrPending) {
    const provider = await db.externalProvider.findUnique({
      where: { id: existing.externalProviderId },
      select: { name: true },
    });
    void dispatchNotification({
      type: "provider.drop",
      orgId: existing.participant.orgId,
      participantId: existing.participantId,
      engagementId: existing.id,
      providerName: provider?.name ?? "An external provider",
      reason: parsed.data.notes || null,
    });
  }

  revalidatePath(`/sc/participants/${existing.participantId}`);
  revalidatePath(`/sc/providers/${existing.externalProviderId}`);
  redirect(`/sc/participants/${existing.participantId}`);
}

export async function quickAdvanceEngagementAction(
  engagementId: string,
  toStatus: "AGREEMENT_SENT" | "ACTIVE" | "ENDED" | "DECLINED"
) {
  const context = await resolvePortalContext("sc");
  assertCoordinator(context);

  const existing = await db.scEngagement.findFirst({
    where: {
      id: engagementId,
      participant: { orgId: context.activeOrg.id },
    },
    select: {
      id: true,
      participantId: true,
      externalProviderId: true,
      status: true,
      participant: { select: { orgId: true } },
    },
  });
  if (!existing) return;

  const wasActiveOrPending =
    existing.status === "ACTIVE" ||
    existing.status === "AGREEMENT_SENT" ||
    existing.status === "PROPOSED";

  await db.scEngagement.update({
    where: { id: existing.id },
    data: {
      status: toStatus,
      // Auto-stamp startedAt when becoming ACTIVE if not set
      ...(toStatus === "ACTIVE" ? { startedAt: new Date() } : {}),
      ...(toStatus === "ENDED" ? { endedAt: new Date() } : {}),
    },
  });

  // Q4 (2026-05-12): provider-drop fan-out — same as updateEngagement.
  if (toStatus === "ENDED" && wasActiveOrPending) {
    const provider = await db.externalProvider.findUnique({
      where: { id: existing.externalProviderId },
      select: { name: true },
    });
    void dispatchNotification({
      type: "provider.drop",
      orgId: existing.participant.orgId,
      participantId: existing.participantId,
      engagementId: existing.id,
      providerName: provider?.name ?? "An external provider",
      reason: null,
    });
  }

  revalidatePath(`/sc/participants/${existing.participantId}`);
}