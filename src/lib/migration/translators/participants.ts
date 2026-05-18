// participants → Participant
//
// Per client answer #8: no existing CarePlans, so we do NOT auto-create
// CarePlan rows. Clinical fields on the source (medical_conditions,
// behaviours_of_concern, etc.) are NOT carried over — they should be
// captured into a fresh CarePlan as part of onboarding the participant
// into the new system. We warn for every participant that has any
// populated clinical field so the org can decide whether to back-fill.
//
// Address fields (street/suburb/state/postcode) are concatenated into
// the new schema's single `address` String — the legacy granularity is
// lost.
//
// Skipped:
//   - `is_demo = true` rows
//   - assigned_practitioner_id reference (handled by a separate
//     practitioner-customer pass if/when needed)

import { source, target } from "../clients";
import { IdMap } from "../id-map";
import type { TranslatorLog, RunMode } from "../logger";

function joinAddress(p: {
  street_address: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
}): string | null {
  const parts = [p.street_address, p.suburb, p.state, p.postcode]
    .map((s) => s?.trim())
    .filter((s): s is string => Boolean(s));
  return parts.length > 0 ? parts.join(", ") : null;
}

const CLINICAL_FIELDS = [
  "medical_conditions",
  "medications",
  "disabilities",
  "behaviours_of_concern",
  "triggers_antecedents",
  "early_warning_signs",
  "escalation_patterns",
  "behaviour_overview_summary",
  "behavioural_tendencies",
  "proactive_strategies",
  "reactive_strategies",
  "escalation_steps",
  "restricted_practices",
  "support_requirements",
  "risk_indicators",
  "risk_factors",
  "sensory_profile",
  "communication_style",
  "environmental_needs",
  "support_environment_family_context",
  "functional_daily_living_profile",
  "primary_diagnosis",
  "secondary_diagnosis",
  "de_escalation_strategies",
] as const;

export async function migrateParticipants(
  log: TranslatorLog,
  mode: RunMode,
  providerOrgsMap: IdMap
): Promise<IdMap> {
  const map = await IdMap.load("participants", "Participant");
  const rows = await source.participants.findMany({ orderBy: { id: "asc" } });

  for (const row of rows) {
    try {
      if (map.has(row.id)) {
        log.record("skipped");
        continue;
      }

      if (row.is_demo) {
        // Mark in id-map so dependent translators (plans, goals, notes,
        // alerts, risks, contacts) know to silently skip child rows
        // rather than fail with "participant not in id-map".
        map.markSkipped(row.id);
        log.record("skipped");
        continue;
      }

      const orgId = providerOrgsMap.get(row.provider_company_id);
      if (!orgId) {
        log.fail(
          row.id,
          `provider_company_id=${row.provider_company_id} not in orgs id-map`
        );
        continue;
      }

      // Warn if any clinical fields are populated — they won't be
      // carried into the new Participant. Per Q8, CarePlans are not
      // auto-created.
      const populatedClinical = CLINICAL_FIELDS.filter(
        (f) => (row as unknown as Record<string, unknown>)[f]
      );
      if (populatedClinical.length > 0) {
        log.warn(
          `participants(${row.id}) has ${populatedClinical.length} clinical fields populated (${populatedClinical.slice(0, 3).join(", ")}…) — NOT migrated per Q8`
        );
      }

      const address = joinAddress(row);

      if (mode === "commit") {
        const created = await target.participant.create({
          data: {
            orgId,
            firstName: row.first_name,
            lastName: row.last_name ?? "",
            dateOfBirth: row.dob,
            pronouns: row.pronouns,
            email: row.contact_email,
            phone: row.contact_phone,
            address,
            ndisNumber: row.ndis_number,
            createdAt: row.created_at ?? new Date(),
          },
        });
        map.set(row.id, created.id);
      } else {
        map.set(row.id, `<dry-run:participant:${row.id}>`);
      }
      log.record("created");
    } catch (err) {
      log.fail(row.id, err instanceof Error ? err.message : String(err));
    }
  }

  await map.save(mode);
  return map;
}