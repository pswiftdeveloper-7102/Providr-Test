// incidents → Incident
//
// Live `incidents` is the widest table in the source (60+ columns).
// Most of it maps to fields on the new `Incident` model. A handful of
// audit/triage fields (locked_at, triage_result, post-incident review)
// have no direct target — they are NOT migrated; if anyone needs them
// later we'd add columns to the target model.
//
// Skipped:
//   - is_demo = true rows
//   - deleted_at not null (soft-deleted in source)
//
// Lossy:
//   - reportable_category, notification_deadline, notification_sent_at,
//     commission_notification_reference are not on the new Incident
//   - approved_by_user_id, locked_at, triage_* fields not on the new model
//   - notifications_sent / staff_involved / key_contributing_factors JSON
//     blobs lost (not on new model)

import type {
  IncidentType,
  IncidentSeverity,
  IncidentStatus,
  IncidentSource,
} from "@prisma/client";

import { source, target } from "../clients";
import { IdMap } from "../id-map";
import type { TranslatorLog, RunMode } from "../logger";

function mapType(raw: string | null): IncidentType | null {
  if (!raw) return null;
  const s = raw.toLowerCase();
  if (s.includes("injur")) return "INJURY";
  if (s.includes("abuse")) return "ABUSE";
  if (s.includes("neglect")) return "NEGLECT";
  if (s.includes("unlawful")) return "UNLAWFUL_CONTACT";
  if (s.includes("restrictive")) return "UNAUTHORISED_RESTRICTIVE_PRACTICE";
  if (s.includes("property")) return "PROPERTY_DAMAGE";
  if (s.includes("medic")) return "MEDICATION_ERROR";
  if (s.includes("missing")) return "MISSING_PERSON";
  if (s.includes("death")) return "DEATH";
  return "OTHER";
}

function mapSeverity(
  raw: string | null,
  isNdisReportable: boolean
): IncidentSeverity {
  if (isNdisReportable) return "REPORTABLE";
  const s = (raw ?? "").toLowerCase();
  if (s.includes("minor")) return "MINOR";
  if (s.includes("moderate")) return "MODERATE";
  if (s.includes("serious") || s.includes("major")) return "SERIOUS";
  if (s.includes("reportable")) return "REPORTABLE";
  return "MODERATE";
}

function mapStatus(raw: string | null | undefined): IncidentStatus {
  const s = (raw ?? "").toLowerCase();
  if (s === "draft") return "DRAFT";
  if (s.includes("review") || s.includes("approv")) return "UNDER_REVIEW";
  if (s.includes("closed") || s.includes("complet") || s.includes("locked"))
    return "CLOSED";
  return "REPORTED";
}

function mapSource(raw: string | null | undefined): IncidentSource {
  const s = (raw ?? "").toLowerCase();
  if (s === "wizard") return "WIZARD";
  if (s === "ai") return "AI_ASSISTED";
  if (s === "auto") return "AUTO";
  return "QUICK";
}

export async function migrateIncidents(
  log: TranslatorLog,
  mode: RunMode,
  providerOrgsMap: IdMap,
  participantsMap: IdMap,
  usersMap: IdMap
): Promise<IdMap> {
  const map = await IdMap.load("incidents", "Incident");
  const rows = await source.incidents.findMany({ orderBy: { id: "asc" } });

  for (const row of rows) {
    try {
      if (map.has(row.id)) {
        log.record("skipped");
        continue;
      }
      if (row.is_demo) {
        log.record("skipped");
        continue;
      }
      if (row.deleted_at) {
        log.record("skipped");
        continue;
      }

      const orgId = providerOrgsMap.get(row.provider_company_id);
      if (!orgId) {
        log.fail(row.id, `org not in map for provider_company_id=${row.provider_company_id}`);
        continue;
      }

      const participantId = row.participant_id
        ? participantsMap.get(row.participant_id) ?? null
        : null;
      const createdById = row.reporting_user_id
        ? usersMap.get(row.reporting_user_id) ?? null
        : null;

      const restrictiveNotes = [
        row.restrictive_practice_type ? `Type: ${row.restrictive_practice_type}` : null,
        row.restrictive_practice_authorized !== null
          ? `Authorised: ${row.restrictive_practice_authorized ? "yes" : "no"}`
          : null,
        row.restrictive_practice_bsp_reference
          ? `BSP ref: ${row.restrictive_practice_bsp_reference}`
          : null,
      ]
        .filter(Boolean)
        .join("\n");

      if (mode === "commit") {
        const created = await target.incident.create({
          data: {
            orgId,
            participantId,
            shiftId: null, // no shifts in legacy DB
            occurredAt: row.incident_date_time ?? row.created_at ?? new Date(),
            reportedAt: row.submitted_at,
            severity: mapSeverity(row.severity, row.is_ndis_reportable),
            status: mapStatus(row.status),
            description: row.description ?? row.what_happened ?? "",
            immediateActions: row.immediate_actions_taken,
            reportedToNdisAt: row.notification_sent_at,
            createdById,
            source: mapSource(row.reporting_mode),
            incidentType: mapType(row.incident_type),
            location: row.location,
            narrativeInput: row.what_happened,
            medicalAttention: row.medical_treatment_required,
            medicalNotes: row.injury_details,
            restrictivePractice: row.restrictive_practice_used,
            restrictiveNotes: restrictiveNotes || null,
            witnessNames: row.witnesses,
            declarationName: row.reporter_signature,
            declarationSignedAt: row.reporter_signed_at,
            createdAt: row.created_at ?? new Date(),
            updatedAt: row.updated_at ?? new Date(),
          },
        });
        map.set(row.id, created.id);
      } else {
        map.set(row.id, `<dry-run:incident:${row.id}>`);
      }
      log.record("created");
    } catch (err) {
      log.fail(row.id, err instanceof Error ? err.message : String(err));
    }
  }

  await map.save();
  return map;
}