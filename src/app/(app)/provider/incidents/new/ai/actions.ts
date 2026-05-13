"use server";

import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import {
  extractIncidentFromNarrative,
  type ExtractedIncident,
} from "@/lib/incident-extraction/extract-incident";

export type ExtractIncidentState = {
  error?: string;
  fieldErrors?: { narrative?: string };
  ok?: boolean;
  extracted?: ExtractedIncident;
  narrative?: string;
  participantId?: string;
  source?: "claude" | "mock";
};

export async function extractIncidentAction(
  _prev: ExtractIncidentState,
  formData: FormData
): Promise<ExtractIncidentState> {
  await resolvePortalContext("provider"); // auth gate

  const narrative = String(formData.get("narrative") ?? "").trim();
  const participantId = String(formData.get("participantId") ?? "");

  if (narrative.length < 20) {
    return {
      fieldErrors: {
        narrative:
          "Add more detail — at least 20 characters so the AI has something to work with.",
      },
    };
  }
  // If a participant was selected, scope-check against the org.
  if (participantId) {
    const context = await resolvePortalContext("provider");
    const ok = await db.participant.findFirst({
      where: { id: participantId, orgId: context.activeOrg.id },
      select: { id: true },
    });
    if (!ok) {
      return {
        error: "Participant not found — pick again or leave blank.",
      };
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