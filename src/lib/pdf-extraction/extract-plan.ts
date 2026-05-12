// Q5 (2026-05-12): extract structured plan data from an uploaded NDIS
// plan PDF. The client may not have an LLM key yet — when ANTHROPIC_API_KEY
// is set we call Claude with PDF input; otherwise we return a stub
// payload so the on-screen confirmation flow still works end-to-end. The
// confirmation step exists specifically because extraction is best-effort
// and the admin must review every field before save.

import { z } from "zod";

export const extractedPlanSchema = z.object({
  ndisPlanNumber: z.string().nullable(),
  startDate: z.string().nullable(), // ISO yyyy-mm-dd or null
  endDate: z.string().nullable(),
  coreDollars: z.number().nullable(),
  capacityDollars: z.number().nullable(),
  capitalDollars: z.number().nullable(),
  confidence: z.enum(["high", "medium", "low"]).default("medium"),
  notes: z.string().nullable().default(null),
});

export type ExtractedPlan = z.infer<typeof extractedPlanSchema>;

const SYSTEM_PROMPT = `You extract fields from NDIS (National Disability Insurance Scheme, Australia) participant plan PDFs. Return ONLY a JSON object matching this exact schema:

{
  "ndisPlanNumber": string | null,         // e.g. "PLAN-2026-AB123"; null if not present
  "startDate": string | null,              // ISO date "YYYY-MM-DD"
  "endDate": string | null,                // ISO date "YYYY-MM-DD"
  "coreDollars": number | null,            // Core supports total in AUD (not cents)
  "capacityDollars": number | null,        // Capacity Building total in AUD
  "capitalDollars": number | null,         // Capital total in AUD
  "confidence": "high" | "medium" | "low",
  "notes": string | null
}

Rules:
- If a value isn't clearly present, return null for that field — don't guess.
- Bucket totals should be the total amount funded for the plan period for that bucket, not per month.
- "Core Supports" sometimes appears as "Core" or split across sub-categories — sum them.
- "Capacity Building" is sometimes labelled "CB" — same idea.
- "Capital" may include "Assistive Technology" + "Home Modifications" — sum them.
- Dates: convert any Australian date format (dd/mm/yyyy, "1 July 2026", etc.) to ISO YYYY-MM-DD.
- "confidence": "high" if all six required fields are clearly present and unambiguous, "medium" if one or two are ambiguous, "low" if you had to skip multiple fields.
- "notes": one short sentence describing anything unusual you saw (e.g. "Multiple sub-categories under Core were summed.") or null.
- Output JSON only — no prose, no markdown fences.`;

const MOCK_RESULT: ExtractedPlan = {
  ndisPlanNumber: null,
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10),
  coreDollars: 45000,
  capacityDollars: 12000,
  capitalDollars: 3000,
  confidence: "low",
  notes:
    "No ANTHROPIC_API_KEY is configured — these values are a placeholder so you can verify the confirmation flow. Please overwrite them with the real figures from the PDF.",
};

export type ExtractionResult =
  | { ok: true; data: ExtractedPlan; source: "claude" | "mock" }
  | { ok: false; error: string };

export async function extractPlanFromPdf(
  pdfBuffer: Buffer
): Promise<ExtractionResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { ok: true, data: MOCK_RESULT, source: "mock" };
  }

  try {
    const base64 = pdfBuffer.toString("base64");
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
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: base64,
                },
              },
              {
                type: "text",
                text: "Extract the plan fields per the schema. Output JSON only.",
              },
            ],
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
    // Be permissive — the model occasionally wraps in ```json fences.
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart < 0 || jsonEnd <= jsonStart) {
      return { ok: false, error: "Couldn't find JSON in the model response." };
    }
    const slice = text.slice(jsonStart, jsonEnd + 1);
    const parsed = extractedPlanSchema.safeParse(JSON.parse(slice));
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