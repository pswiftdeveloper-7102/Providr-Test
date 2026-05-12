"use server";

import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import { assertManager } from "@/lib/rbac";
import { saveUpload } from "@/lib/uploads";
import {
  extractPlanFromPdf,
  type ExtractedPlan,
} from "@/lib/pdf-extraction/extract-plan";

export type ExtractPlanState = {
  error?: string;
  ok?: boolean;
  // Echoed back into the confirmation form.
  extracted?: ExtractedPlan;
  fileKey?: string;
  fileName?: string;
  source?: "claude" | "mock";
};

export async function extractPlanFromUploadAction(
  participantId: string,
  _prev: ExtractPlanState,
  formData: FormData
): Promise<ExtractPlanState> {
  const context = await resolvePortalContext("provider");
  assertManager(context);

  const participant = await db.participant.findFirst({
    where: { id: participantId, orgId: context.activeOrg.id },
    select: { id: true },
  });
  if (!participant) {
    return { error: "Participant not found." };
  }

  const file = formData.get("planPdf");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please upload a PDF of the plan." };
  }
  if (file.type !== "application/pdf") {
    return { error: "Only PDF files are supported." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let saved;
  try {
    saved = await saveUpload(file);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Upload failed.",
    };
  }

  const result = await extractPlanFromPdf(buffer);
  if (!result.ok) {
    // Keep the uploaded file so the admin can still create the plan
    // manually with the PDF attached.
    return {
      error: `Extraction failed: ${result.error}`,
      fileKey: saved.key,
      fileName: saved.name,
    };
  }

  return {
    ok: true,
    extracted: result.data,
    fileKey: saved.key,
    fileName: saved.name,
    source: result.source,
  };
}