"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import { dispatchNotification } from "@/lib/notifications/dispatch";

const severityEnum = z.enum([
  "MINOR",
  "MODERATE",
  "SERIOUS",
  "REPORTABLE",
]);

const statusEnum = z.enum([
  "DRAFT",
  "REPORTED",
  "UNDER_REVIEW",
  "CLOSED",
]);

const createIncidentSchema = z.object({
  participantId: z.string().min(1, "Pick a participant."),
  shiftId: z.string().optional().or(z.literal("")),
  severity: severityEnum,
  occurredAt: z.string().min(1, "Date and time required."),
  description: z
    .string()
    .trim()
    .min(10, "Describe what happened (10+ characters)."),
  immediateActions: z.string().trim().optional().or(z.literal("")),
});

export type CreateIncidentState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

async function loadIncident(incidentId: string) {
  const context = await resolvePortalContext("provider");
  const incident = await db.incident.findFirst({
    where: { id: incidentId, orgId: context.activeOrg.id },
  });
  return { context, incident };
}

export async function createIncidentAction(
  _prev: CreateIncidentState,
  formData: FormData
): Promise<CreateIncidentState> {
  const context = await resolvePortalContext("provider");

  const parsed = createIncidentSchema.safeParse({
    participantId: formData.get("participantId"),
    shiftId: formData.get("shiftId") ?? "",
    severity: formData.get("severity"),
    occurredAt: formData.get("occurredAt"),
    description: formData.get("description"),
    immediateActions: formData.get("immediateActions"),
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

  // Confirm the participant belongs to the active org.
  const participant = await db.participant.findFirst({
    where: { id: data.participantId, orgId: context.activeOrg.id },
    select: { id: true },
  });
  if (!participant) {
    return { fieldErrors: { participantId: "Participant not found." } };
  }

  // Optionally validate the shift link if provided.
  if (data.shiftId) {
    const shift = await db.shift.findFirst({
      where: { id: data.shiftId, orgId: context.activeOrg.id },
      select: { id: true },
    });
    if (!shift) {
      return { fieldErrors: { shiftId: "Shift not found." } };
    }
  }

  const occurredAt = new Date(data.occurredAt);
  if (Number.isNaN(occurredAt.getTime())) {
    return { fieldErrors: { occurredAt: "Invalid date/time." } };
  }

  const session = await auth();

  // The 24h clock starts when the manager is informed. For v1 we mark
  // `reportedAt = now` on creation since that's when the record reaches
  // the system. If a DRAFT workflow gets added later, only flip
  // `reportedAt` on the manager's review.
  const now = new Date();

  const created = await db.incident.create({
    data: {
      orgId: context.activeOrg.id,
      participantId: data.participantId,
      shiftId: data.shiftId || null,
      occurredAt,
      reportedAt: now,
      severity: data.severity,
      status: "REPORTED",
      description: data.description,
      immediateActions: data.immediateActions || null,
      createdById: session?.user?.id ?? null,
    },
  });

  // Q4 (2026-05-12): reportable incidents trigger the in-app + email +
  // SMS fan-out. The dispatcher pulls org admins + the compliance contact
  // and is best-effort — if email/SMS transports aren't configured, it
  // logs to the server console and returns ok=true so the incident
  // creation flow isn't gated on a side-effect.
  if (data.severity === "REPORTABLE") {
    void dispatchNotification({
      type: "incident.reportable",
      orgId: context.activeOrg.id,
      participantId: data.participantId,
      incidentId: created.id,
      summary: data.description.slice(0, 280),
    });
  }

  revalidatePath("/provider/incidents");
  revalidatePath("/provider");
  redirect(`/provider/incidents/${created.id}`);
}

export async function markReportedToNdisAction(incidentId: string) {
  const { incident } = await loadIncident(incidentId);
  if (!incident) return { error: "Incident not found." };
  if (incident.reportedToNdisAt) {
    return { error: "Already marked as submitted to NDIS." };
  }
  await db.incident.update({
    where: { id: incident.id },
    data: { reportedToNdisAt: new Date() },
  });
  revalidatePath("/provider/incidents");
  revalidatePath(`/provider/incidents/${incidentId}`);
  return { ok: true };
}

const updateStatusSchema = statusEnum;

export async function updateIncidentStatusAction(
  incidentId: string,
  status: string
) {
  const parsed = updateStatusSchema.safeParse(status);
  if (!parsed.success) return { error: "Invalid status." };

  const { incident } = await loadIncident(incidentId);
  if (!incident) return { error: "Incident not found." };

  await db.incident.update({
    where: { id: incident.id },
    data: { status: parsed.data },
  });
  revalidatePath("/provider/incidents");
  revalidatePath(`/provider/incidents/${incidentId}`);
  return { ok: true };
}