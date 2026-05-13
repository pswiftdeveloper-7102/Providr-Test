// Extracts NDIS-compliant incident fields from a free-text narrative.
// Env-gated on ANTHROPIC_API_KEY with a deterministic mock fallback so
// the AI flow's confirmation UI works end-to-end in development.

import { z } from "zod";

export const extractedIncidentSchema = z.object({
  incidentType: z
    .enum([
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
    ])
    .nullable(),
  severity: z
    .enum(["MINOR", "MODERATE", "SERIOUS", "REPORTABLE"])
    .nullable(),
  occurredAt: z.string().nullable(), // ISO datetime, or null if unclear
  location: z.string().nullable(),
  description: z.string(), // Restated structured description
  immediateActions: z.string().nullable(),
  confidence: z.enum(["high", "medium", "low"]).default("medium"),
  notes: z.string().nullable().default(null),
});

export type ExtractedIncident = z.infer<typeof extractedIncidentSchema>;

const SYSTEM_PROMPT = `You extract NDIS incident-report fields from a support worker's free-text narrative. Return ONLY a JSON object matching this exact schema:

{
  "incidentType": "INJURY"|"ABUSE"|"NEGLECT"|"UNLAWFUL_CONTACT"|"UNAUTHORISED_RESTRICTIVE_PRACTICE"|"PROPERTY_DAMAGE"|"MEDICATION_ERROR"|"MISSING_PERSON"|"DEATH"|"OTHER"|null,
  "severity": "MINOR"|"MODERATE"|"SERIOUS"|"REPORTABLE"|null,
  "occurredAt": "YYYY-MM-DDTHH:MM" | null,
  "location": string | null,
  "description": string,             // Clean, structured restatement of what happened in 1-3 sentences
  "immediateActions": string | null, // What the worker did in response
  "confidence": "high"|"medium"|"low",
  "notes": string | null             // Brief note on any ambiguity or missing info, or null
}

NDIS reportable categories (severity REPORTABLE):
- Death of a participant
- Serious injury of a participant
- Abuse or neglect of a participant
- Unlawful sexual or physical contact with a participant
- Sexual misconduct committed against a participant
- Use of a restrictive practice in relation to a participant other than where in line with an authorisation

Rules:
- If narrative is too thin to pick a value, return null for that field — don't guess.
- Severity rule of thumb: minor scrape/bump = MINOR; injury needing first aid = MODERATE; ED-level or required hospitalisation = SERIOUS; anything matching the reportable list above = REPORTABLE.
- Restate "description" in clear, professional language stripping speculation and emotive content. Keep it factual.
- "confidence": "high" if all four required fields (type, severity, location, description) are clear; "medium" if 1-2 ambiguous; "low" otherwise.
- Output JSON only — no prose, no markdown fences.`;

const MOCK_RESULT: ExtractedIncident = {
  incidentType: "INJURY",
  severity: "MINOR",
  occurredAt: null,
  location: "Participant's home",
  description:
    "Participant tripped on a loose rug in the hallway and sustained a graze to the left knee. No further injury observed.",
  immediateActions:
    "Applied antiseptic and a dressing. Notified supervisor by phone.",
  confidence: "low",
  notes:
    "Placeholder values — set ANTHROPIC_API_KEY on the server to enable real extraction from your narrative.",
};

export type ExtractionResult =
  | { ok: true; data: ExtractedIncident; source: "claude" | "mock" }
  | { ok: false; error: string };

export async function extractIncidentFromNarrative(
  narrative: string
): Promise<ExtractionResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Mock — preserves the user's narrative as the description so the
    // confirmation step still feels relevant.
    return {
      ok: true,
      data: {
        ...MOCK_RESULT,
        description: narrative.slice(0, 600),
      },
      source: "mock",
    };
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Worker narrative:\n\n${narrative}\n\nExtract the fields per the schema. Output JSON only.`,
          },
        ],
      }),
    });
    if (!res.ok) {
      const errBody = await res.text();
      return {
        ok: false,
        error: `Claude API ${res.status}: ${errBody.slice(0, 240)}`,
      };
    }
    const payload = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text = payload.content?.find((b) => b.type === "text")?.text ?? "";
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart < 0 || jsonEnd <= jsonStart) {
      return { ok: false, error: "Couldn't find JSON in the model response." };
    }
    const slice = text.slice(jsonStart, jsonEnd + 1);
    const parsed = extractedIncidentSchema.safeParse(JSON.parse(slice));
    if (!parsed.success) {
      return {
        ok: false,
        error: `Extracted JSON didn't match schema: ${parsed.error.issues[0]?.message}`,
      };
    }
    return { ok: true, data: parsed.data, source: "claude" };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Extraction failed.",
    };
  }
}