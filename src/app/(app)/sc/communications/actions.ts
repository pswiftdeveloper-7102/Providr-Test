"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import { assertCoordinator } from "@/lib/rbac";

const directionEnum = z.enum(["INBOUND", "OUTBOUND"]);
const channelEnum = z.enum(["PHONE", "EMAIL", "SMS", "IN_PERSON", "VIDEO", "OTHER"]);

const logSchema = z.object({
  participantId: z.string().min(1, "Participant is required."),
  occurredAt: z.string().min(1, "When did it happen?"),
  direction: directionEnum,
  channel: channelEnum,
  withParty: z.string().trim().min(1, "Who was it with?"),
  summary: z.string().trim().min(2, "Add a one-line summary."),
  followUp: z.string().trim().optional().or(z.literal("")),
});

export type CommunicationLogState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
};

export async function logCommunicationAction(
  _prev: CommunicationLogState,
  formData: FormData
): Promise<CommunicationLogState> {
  const context = await resolvePortalContext("sc");
  assertCoordinator(context);

  const parsed = logSchema.safeParse({
    participantId: formData.get("participantId"),
    occurredAt: formData.get("occurredAt"),
    direction: formData.get("direction"),
    channel: formData.get("channel"),
    withParty: formData.get("withParty"),
    summary: formData.get("summary"),
    followUp: formData.get("followUp"),
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
  await db.communicationLog.create({
    data: {
      orgId: context.activeOrg.id,
      participantId: participant.id,
      occurredAt: new Date(parsed.data.occurredAt),
      direction: parsed.data.direction,
      channel: parsed.data.channel,
      withParty: parsed.data.withParty,
      summary: parsed.data.summary,
      followUp: parsed.data.followUp || null,
      createdById: session?.user?.id ?? null,
    },
  });

  revalidatePath("/sc/communications");
  revalidatePath(`/sc/participants/${participant.id}`);
  return { ok: true };
}

export async function deleteCommunicationAction(logId: string) {
  const context = await resolvePortalContext("sc");
  assertCoordinator(context);

  const log = await db.communicationLog.findFirst({
    where: { id: logId, orgId: context.activeOrg.id },
    select: { id: true, participantId: true },
  });
  if (!log) return;

  await db.communicationLog.delete({ where: { id: log.id } });
  revalidatePath("/sc/communications");
  revalidatePath(`/sc/participants/${log.participantId}`);
}