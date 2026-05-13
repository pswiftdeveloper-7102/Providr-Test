"use server";

import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import {
  extractIncidentFromNarrative,
  type ExtractedIncident,
} from "@/lib/incident-extraction/extract-incident";

export type AppExtractState = {
  error?: string;
  fieldErrors?: { narrative?: string };
  ok?: boolean;
  extracted?: ExtractedIncident;
  narrative?: string;
  participantId?: string;
  source?: "claude" | "mock";
};

export async function appExtractIncidentAction(
  _prev: AppExtractState,
  formData: FormData
): Promise<AppExtractState> {
  const context = await resolvePortalContext("provider");

  const narrative = String(formData.get("narrative") ?? "").trim();
  const participantId = String(formData.get("participantId") ?? "");

  if (narrative.length < 20) {
    return {
      fieldErrors: {
        narrative: "Add more detail — at least 20 characters.",
      },
    };
  }
  if (participantId) {
    const ok = await db.participant.findFirst({
      where: { id: participantId, orgId: context.activeOrg.id },
      select: { id: true },
    });
    if (!ok) {
      return { error: "Participant not found." };
    }
  }

  const result = await extractIncidentFromNarrative(narrative);
  if (!result.ok) {
    return { error: `Extraction failed: ${result.error}`, narrative };
  }

  return {
    ok: true,
    extracted: result.data,
    narrative,
    participantId: participantId || undefined,
    source: result.source,
  };
}