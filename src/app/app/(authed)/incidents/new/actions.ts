"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import { dispatchNotification } from "@/lib/notifications/dispatch";

// Mirror of the provider/incidents actions, but with redirects scoped
// to /app so the PWA user never gets bounced into the desktop portal
// after submitting a report.

const severityEnum = z.enum(["MINOR", "MODERATE", "SERIOUS", "REPORTABLE"]);
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

export type AppIncidentState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const quickSchema = z.object({
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

const wizardSchema = z.object({
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
  medicalAttention: z.string().optional().or(z.literal("")),
  medicalNotes: z.string().trim().optional().or(z.literal("")),
  restrictivePractice: z.string().optional().or(z.literal("")),
  restrictiveNotes: z.string().trim().optional().or(z.literal("")),
  declarationName: z.string().trim().min(2, "Sign with your full name."),
});

const aiSchema = z.object({
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

function collectFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0]);
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

async function ensureParticipantInOrg(
  participantId: string | undefined,
  orgId: string
) {
  if (!participantId) return null;
  const ok = await db.participant.findFirst({
    where: { id: participantId, orgId },
    select: { id: true },
  });
  return ok;
}

export async function createAppQuickIncident(
  _prev: AppIncidentState,
  formData: FormData
): Promise<AppIncidentState> {
  const context = await resolvePortalContext("provider");

  const parsed = quickSchema.safeParse({
    participantId: formData.get("participantId") ?? "",
    occurredAt: formData.get("occurredAt"),
    location: formData.get("location") ?? "",
    incidentType: formData.get("incidentType") || undefined,
    severity: formData.get("severity") || undefined,
    description: formData.get("description"),
    immediateActions: formData.get("immediateActions") ?? "",
  });
  if (!parsed.success) {
    return { fieldErrors: collectFieldErrors(parsed.error) };
  }

  const data = parsed.data;
  if (data.participantId) {
    const ok = await ensureParticipantInOrg(
      data.participantId,
      context.activeOrg.id
    );
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
      reportedAt: null,
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

  revalidatePath("/app/incidents");
  redirect(`/app/incidents/${created.id}`);
}

export async function createAppWizardIncident(
  _prev: AppIncidentState,
  formData: FormData
): Promise<AppIncidentState> {
  const context = await resolvePortalContext("provider");

  const parsed = wizardSchema.safeParse({
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
    return { fieldErrors: collectFieldErrors(parsed.error) };
  }

  const data = parsed.data;
  if (data.participantId) {
    const ok = await ensureParticipantInOrg(
      data.participantId,
      context.activeOrg.id
    );
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

  revalidatePath("/app/incidents");
  redirect(`/app/incidents/${created.id}`);
}

export async function createAppAIIncident(
  _prev: AppIncidentState,
  formData: FormData
): Promise<AppIncidentState> {
  const context = await resolvePortalContext("provider");

  const parsed = aiSchema.safeParse({
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
    return { fieldErrors: collectFieldErrors(parsed.error) };
  }

  const data = parsed.data;
  if (data.participantId) {
    const ok = await ensureParticipantInOrg(
      data.participantId,
      context.activeOrg.id
    );
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

  revalidatePath("/app/incidents");
  redirect(`/app/incidents/${created.id}`);
}