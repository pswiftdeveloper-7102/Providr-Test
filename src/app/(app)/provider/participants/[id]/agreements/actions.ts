"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import { assertManager } from "@/lib/rbac";
import { saveBuffer, saveUpload } from "@/lib/uploads";
import { renderServiceAgreementPdf } from "@/lib/pdf/service-agreement-pdf";

const createAgreementSchema = z.object({
  startDate: z.string().min(1, "Start date is required."),
  endDate: z.string().optional().or(z.literal("")),
  signedAt: z.string().optional().or(z.literal("")),
  documentUrl: z
    .string()
    .trim()
    .url("Must be a valid URL.")
    .optional()
    .or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
});

export type CreateAgreementState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function createAgreementAction(
  participantId: string,
  _prev: CreateAgreementState,
  formData: FormData
): Promise<CreateAgreementState> {
  const context = await resolvePortalContext("provider");
  assertManager(context);

  // Confirm participant belongs to the active org. Pull the fields the PDF
  // generator needs at the same time so we don't refetch later.
  const participant = await db.participant.findFirst({
    where: { id: participantId, orgId: context.activeOrg.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      ndisNumber: true,
      address: true,
      dateOfBirth: true,
      pronouns: true,
    },
  });
  if (!participant) {
    return { error: "Participant not found." };
  }

  const parsed = createAgreementSchema.safeParse({
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    signedAt: formData.get("signedAt"),
    documentUrl: formData.get("documentUrl"),
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

  const data = parsed.data;
  const start = new Date(data.startDate);
  const end = data.endDate ? new Date(data.endDate) : null;
  const signed = data.signedAt ? new Date(data.signedAt) : null;

  if (end && end <= start) {
    return {
      fieldErrors: { endDate: "End date must be after start date." },
    };
  }

  // Optional file upload — only attempt save if a non-empty file is
  // present (an empty file input still posts a File with size 0).
  const file = formData.get("documentFile");
  let uploadedFileKey: string | null = null;
  let uploadedFileName: string | null = null;
  if (file instanceof File && file.size > 0) {
    try {
      const saved = await saveUpload(file);
      uploadedFileKey = saved.key;
      uploadedFileName = saved.name;
    } catch (err) {
      return {
        fieldErrors: {
          documentFile:
            err instanceof Error ? err.message : "Upload failed.",
        },
      };
    }
  }

  // Q7 (2026-05-12): if the admin hasn't uploaded a signed copy AND hasn't
  // pasted an external link, auto-generate the agreement PDF from
  // participant + org metadata + the notes/services field. The generated
  // file lives in the same /api/uploads pipeline so the download UI works
  // without changes.
  const orgRecord = await db.org.findUnique({
    where: { id: context.activeOrg.id },
    select: {
      legalName: true,
      tradingName: true,
      abn: true,
      ndisRegistrationNumber: true,
    },
  });
  const shouldGenerate =
    !uploadedFileKey && !(data.documentUrl && data.documentUrl.length > 0);
  if (shouldGenerate && orgRecord) {
    try {
      const pdfBuffer = await renderServiceAgreementPdf({
        org: orgRecord,
        participant: {
          firstName: participant.firstName,
          lastName: participant.lastName,
          ndisNumber: participant.ndisNumber,
          address: participant.address,
          dateOfBirth: participant.dateOfBirth,
          pronouns: participant.pronouns,
        },
        agreement: {
          startDate: start,
          endDate: end,
          signedAt: signed,
          notes: data.notes || null,
        },
        generatedAt: new Date(),
      });
      const fileName = `service-agreement-${participant.lastName.toLowerCase()}-${start.toISOString().slice(0, 10)}.pdf`;
      const saved = await saveBuffer(pdfBuffer, fileName, "application/pdf");
      uploadedFileKey = saved.key;
      uploadedFileName = saved.name;
    } catch (err) {
      // Don't block agreement creation if PDF generation fails — surface
      // the issue but let the record save so manual upload still works.
      console.error("Service agreement PDF generation failed", err);
    }
  }

  await db.serviceAgreement.create({
    data: {
      participantId,
      startDate: start,
      endDate: end,
      signedAt: signed,
      documentUrl: data.documentUrl || null,
      uploadedFileKey,
      uploadedFileName,
      notes: data.notes || null,
      status: signed ? "ACTIVE" : "DRAFT",
    },
  });

  revalidatePath(`/provider/participants/${participantId}`);
  redirect(`/provider/participants/${participantId}`);
}