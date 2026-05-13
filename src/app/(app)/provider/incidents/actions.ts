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

const typeEnum = z.enum([
  "INJURY",
  "ABUSE",
  "NEGLECT",
  "UNLAWFUL_CONTACT",
  "UNAUTHORISED_RESTRICTIVE_PRACTICE",
  "PROPERTY_DAMAGE",
  "MEDICATION_ERROR",
  "MISSING_PERSON",
  "DEATH",
  "OTHER",
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

// Quick Report — minimal fields, saves as DRAFT. Participant is optional
// (you might be reporting before you can identify them). Severity and
// type are optional too so a worker can log fast and let the supervisor
// fill in the gaps.
const quickIncidentSchema = z.object({
  participantId: z.string().optional().or(z.literal("")),
  occurredAt: z.string().min(1, "Date and time required."),
  location: z.string().trim().optional().or(z.literal("")),
  incidentType: typeEnum.optional(),
  severity: severityEnum.optional(),
  description: z
    .string()
    .trim()
    .min(10, "Describe what happened (10+ characters)."),
  immediateActions: z.string().trim().optional().or(z.literal("")),
});

// Compliance Wizard — captures everything the NDIS Commission form
// asks for. Most fields optional at the schema level; the wizard UI
// enforces required-ness per step.
const wizardIncidentSchema = z.object({
  participantId: z.string().optional().or(z.literal("")),
  occurredAt: z.string().min(1, "Date and time required."),
  location: z.string().trim().min(1, "Location is required."),
  incidentType: typeEnum,
  severity: severityEnum,
  description: z
    .string()
    .trim()
    .min(10, "Describe what happened (10+ characters)."),
  immediateActions: z.string().trim().optional().or(z.literal("")),
  witnessNames: z.string().trim().optional().or(z.literal("")),
  medicalAttention: z
    .string()
    .optional()
    .or(z.literal("")),
  medicalNotes: z.string().trim().optional().or(z.literal("")),
  restrictivePractice: z.string().optional().or(z.literal("")),
  restrictiveNotes: z.string().trim().optional().or(z.literal("")),
  declarationName: z.string().trim().min(2, "Sign with your full name."),
});

const aiIncidentSchema = z.object({
  participantId: z.string().optional().or(z.literal("")),
  occurredAt: z.string().min(1, "Date and time required."),
  location: z.string().trim().optional().or(z.literal("")),
  incidentType: typeEnum.optional(),
  severity: severityEnum,
  description: z
    .string()
    .trim()
    .min(10, "Describe what happened (10+ characters)."),
  immediateActions: z.string().trim().optional().or(z.literal("")),
  narrativeInput: z.string().trim().optional().or(z.literal("")),
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

// ────────── Quick Report (Q4 of the new incident flow) ──────────
export async function createQuickIncidentAction(
  _prev: CreateIncidentState,
  formData: FormData
): Promise<CreateIncidentState> {
  const context = await resolvePortalContext("provider");

  const parsed = quickIncidentSchema.safeParse({
    participantId: formData.get("participantId") ?? "",
    occurredAt: formData.get("occurredAt"),
    location: formData.get("location") ?? "",
    incidentType: formData.get("incidentType") || undefined,
    severity: formData.get("severity") || undefined,
    description: formData.get("description"),
    immediateActions: formData.get("immediateActions") ?? "",
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
  // If a participant was selected, confirm they belong to this org.
  if (data.participantId) {
    const ok = await db.participant.findFirst({
      where: { id: data.participantId, orgId: context.activeOrg.id },
      select: { id: true },
    });
    if (!ok) {
      return { fieldErrors: { participantId: "Participant not found." } };
    }
  }

  const occurredAt = new Date(data.occurredAt);
  if (Number.isNaN(occurredAt.getTime())) {
    return { fieldErrors: { occurredAt: "Invalid date/time." } };
  }

  const session = await auth();
  const created = await db.incident.create({
    data: {
      orgId: context.activeOrg.id,
      participantId: data.participantId || null,
      occurredAt,
      reportedAt: null, // not yet reviewed by manager
      severity: data.severity ?? "MINOR",
      status: "DRAFT",
      description: data.description,
      immediateActions: data.immediateActions || null,
      createdById: session?.user?.id ?? null,
      source: "QUICK",
      incidentType: data.incidentType ?? null,
      location: data.location || null,
    },
  });

  revalidatePath("/provider/incidents");
  redirect(`/provider/incidents/${created.id}`);
}

// ────────── Compliance Wizard ──────────
export async function createWizardIncidentAction(
  _prev: CreateIncidentState,
  formData: FormData
): Promise<CreateIncidentState> {
  const context = await resolvePortalContext("provider");

  const parsed = wizardIncidentSchema.safeParse({
    participantId: formData.get("participantId") ?? "",
    occurredAt: formData.get("occurredAt"),
    location: formData.get("location"),
    incidentType: formData.get("incidentType"),
    severity: formData.get("severity"),
    description: formData.get("description"),
    immediateActions: formData.get("immediateActions") ?? "",
    witnessNames: formData.get("witnessNames") ?? "",
    medicalAttention: formData.get("medicalAttention") ?? "",
    medicalNotes: formData.get("medicalNotes") ?? "",
    restrictivePractice: formData.get("restrictivePractice") ?? "",
    restrictiveNotes: formData.get("restrictiveNotes") ?? "",
    declarationName: formData.get("declarationName"),
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
  if (data.participantId) {
    const ok = await db.participant.findFirst({
      where: { id: data.participantId, orgId: context.activeOrg.id },
      select: { id: true },
    });
    if (!ok) {
      return { fieldErrors: { participantId: "Participant not found." } };
    }
  }

  const occurredAt = new Date(data.occurredAt);
  if (Number.isNaN(occurredAt.getTime())) {
    return { fieldErrors: { occurredAt: "Invalid date/time." } };
  }

  const medicalAttention = data.medicalAttention === "yes";
  const restrictivePractice = data.restrictivePractice === "yes";
  const session = await auth();
  const now = new Date();

  const created = await db.incident.create({
    data: {
      orgId: context.activeOrg.id,
      participantId: data.participantId || null,
      occurredAt,
      reportedAt: now,
      severity: data.severity,
      status: "REPORTED",
      description: data.description,
      immediateActions: data.immediateActions || null,
      createdById: session?.user?.id ?? null,
      source: "WIZARD",
      incidentType: data.incidentType,
      location: data.location,
      witnessNames: data.witnessNames || null,
      medicalAttention,
      medicalNotes: data.medicalNotes || null,
      restrictivePractice,
      restrictiveNotes: data.restrictiveNotes || null,
      declarationName: data.declarationName,
      declarationSignedAt: now,
    },
  });

  if (data.severity === "REPORTABLE" && data.participantId) {
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

// ────────── AI-Assisted: save the reviewed (post-extraction) form ──────────
export async function createAIIncidentAction(
  _prev: CreateIncidentState,
  formData: FormData
): Promise<CreateIncidentState> {
  const context = await resolvePortalContext("provider");

  const parsed = aiIncidentSchema.safeParse({
    participantId: formData.get("participantId") ?? "",
    occurredAt: formData.get("occurredAt"),
    location: formData.get("location") ?? "",
    incidentType: formData.get("incidentType") || undefined,
    severity: formData.get("severity"),
    description: formData.get("description"),
    immediateActions: formData.get("immediateActions") ?? "",
    narrativeInput: formData.get("narrativeInput") ?? "",
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
  if (data.participantId) {
    const ok = await db.participant.findFirst({
      where: { id: data.participantId, orgId: context.activeOrg.id },
      select: { id: true },
    });
    if (!ok) {
      return { fieldErrors: { participantId: "Participant not found." } };
    }
  }

  const occurredAt = new Date(data.occurredAt);
  if (Number.isNaN(occurredAt.getTime())) {
    return { fieldErrors: { occurredAt: "Invalid date/time." } };
  }

  const session = await auth();
  const now = new Date();

  const created = await db.incident.create({
    data: {
      orgId: context.activeOrg.id,
      participantId: data.participantId || null,
      occurredAt,
      reportedAt: now,
      severity: data.severity,
      status: "REPORTED",
      description: data.description,
      immediateActions: data.immediateActions || null,
      createdById: session?.user?.id ?? null,
      source: "AI_ASSISTED",
      incidentType: data.incidentType ?? null,
      location: data.location || null,
      narrativeInput: data.narrativeInput || null,
    },
  });

  if (data.severity === "REPORTABLE" && data.participantId) {
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