// participant_contacts → ExternalContact (formal) OR InformalSupport (informal)
//
// Split rule based on the legacy `relationship` field:
//   - family / friend / guardian / advocate    → InformalSupport
//   - gp / doctor / allied health / ndia /
//     plan manager / hospital / mental health  → ExternalContact
//   - else                                     → InformalSupport(OTHER)
//
// If `organisation` is set but relationship is unclear, lean toward
// ExternalContact (org context implies formal). Emergency flag is
// preserved by setting InformalSupport.isPrimary=true.

import type {
  InformalSupportRelationship,
  ExternalContactType,
} from "@prisma/client";

import { source, target } from "../clients";
import type { IdMap } from "../id-map";
import type { TranslatorLog, RunMode } from "../logger";

type Split =
  | { kind: "informal"; relationship: InformalSupportRelationship }
  | { kind: "external"; type: ExternalContactType };

function classify(
  relationship: string | null,
  organisation: string | null
): Split {
  const r = (relationship ?? "").toLowerCase();
  if (r.includes("family") || r.includes("parent") || r.includes("sibling") || r.includes("spouse"))
    return { kind: "informal", relationship: "FAMILY" };
  if (r.includes("friend")) return { kind: "informal", relationship: "FRIEND" };
  if (r.includes("guardian")) return { kind: "informal", relationship: "GUARDIAN" };
  if (r.includes("advocate")) return { kind: "informal", relationship: "ADVOCATE" };

  if (r.includes("gp") || r.includes("doctor") || r.includes("physician"))
    return { kind: "external", type: "GP" };
  if (r.includes("allied") || r.includes("ot") || r.includes("speech") || r.includes("physio") || r.includes("psych"))
    return { kind: "external", type: "ALLIED_HEALTH" };
  if (r.includes("ndia") || r.includes("planner"))
    return { kind: "external", type: "NDIA_PLANNER" };
  if (r.includes("plan manager") || r.includes("plan_manager"))
    return { kind: "external", type: "PLAN_MANAGER" };
  if (r.includes("hospital")) return { kind: "external", type: "HOSPITAL" };
  if (r.includes("mental")) return { kind: "external", type: "MENTAL_HEALTH" };
  if (r.includes("hous")) return { kind: "external", type: "HOUSING" };
  if (r.includes("educ") || r.includes("school")) return { kind: "external", type: "EDUCATION" };

  // organisation present but relationship unclear → external OTHER
  if (organisation) return { kind: "external", type: "OTHER" };
  return { kind: "informal", relationship: "OTHER" };
}

export async function migrateParticipantContacts(
  log: TranslatorLog,
  mode: RunMode,
  participantsMap: IdMap
): Promise<void> {
  const rows = await source.participant_contacts.findMany({
    orderBy: { id: "asc" },
  });

  for (const row of rows) {
    try {
      const participantId = participantsMap.get(row.participant_id);
      if (!participantId) {
        if (participantsMap.isSkipped(row.participant_id)) {
          log.record("skipped");
          continue;
        }
        log.fail(row.id, `participant ${row.participant_id} not in id-map`);
        continue;
      }

      const split = classify(row.relationship, row.organisation);
      const fullName = [row.first_name, row.last_name].filter(Boolean).join(" ");

      if (mode === "commit") {
        if (split.kind === "informal") {
          await target.informalSupport.create({
            data: {
              participantId,
              name: fullName,
              relationship: split.relationship,
              phone: row.phone,
              email: row.email,
              notes: row.notes,
              isPrimary: row.is_emergency,
              createdAt: row.created_at ?? new Date(),
            },
          });
        } else {
          await target.externalContact.create({
            data: {
              participantId,
              type: split.type,
              organisationName: row.organisation,
              contactName: fullName || null,
              email: row.email,
              phone: row.phone,
              notes: row.notes,
              createdAt: row.created_at ?? new Date(),
            },
          });
        }
      }
      log.record("created");
    } catch (err) {
      log.fail(row.id, err instanceof Error ? err.message : String(err));
    }
  }
}