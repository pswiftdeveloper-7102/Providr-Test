// bsp_analysis_reports → BSPAnalysisReport
//
// 1:1 field mapping (target schema was designed to mirror source).
// Sets migrationSource=MIGRATED_LARAVEL so analytics can distinguish
// legacy vs. native records. legacyAnalysisData is null — nothing was
// dropped.

import { source, target } from "../clients";
import { IdMap } from "../id-map";
import type { TranslatorLog, RunMode } from "../logger";

export async function migrateBSPAnalysisReports(
  log: TranslatorLog,
  mode: RunMode,
  providerOrgsMap: IdMap,
  incidentsMap: IdMap
): Promise<IdMap> {
  const map = await IdMap.load("bsp_analysis_reports", "BSPAnalysisReport");
  const rows = await source.bsp_analysis_reports.findMany({
    orderBy: { id: "asc" },
  });

  for (const row of rows) {
    try {
      if (map.has(row.id)) {
        log.record("skipped");
        continue;
      }

      const incidentId = incidentsMap.get(row.incident_id);
      if (!incidentId) {
        if (incidentsMap.isSkipped(row.incident_id)) {
          log.record("skipped");
          continue;
        }
        log.fail(
          row.id,
          `incident ${row.incident_id} not in id-map — run incidents first`
        );
        continue;
      }
      const orgId = providerOrgsMap.get(row.provider_company_id);
      if (!orgId) {
        log.fail(row.id, `org not in map for provider_company_id=${row.provider_company_id}`);
        continue;
      }

      if (mode === "commit") {
        const created = await target.bSPAnalysisReport.create({
          data: {
            incidentId,
            orgId,
            migrationSource: "MIGRATED_LARAVEL",
            // legacyAnalysisData stays unset (no fields dropped); for an
            // explicit DB NULL pass Prisma.DbNull, but omitting works too.

            bspGapsDetected: row.bsp_gaps_detected ?? undefined,
            bspGapsDetectedDetails: row.bsp_gaps_detected_details,

            draftBspContextOfBehaviour: row.draft_bsp_update_context_of_behaviour,
            draftBspEnvironmentalConsiderations:
              row.draft_bsp_update_environmental_considerations,
            draftBspTraumaInformedAdjustments:
              row.draft_bsp_update_trauma_informed_adjustments,
            draftBspSafetyRecommendations:
              row.draft_bsp_update_safety_recommendations,

            triggerMatchedTriggers: row.trigger_alignment_matched_triggers ?? undefined,
            triggerConfidenceLevel: row.trigger_alignment_confidence_level,
            triggerExplanation: row.trigger_alignment_explanation,

            strategyMissingProactive: row.strategy_assessment_missing_proactive ?? undefined,
            strategyMissedReactive: row.strategy_assessment_missed_reactive ?? undefined,
            strategyStaffResponse: row.strategy_assessment_staff_response,

            identifiedGapsSummary: row.identified_gaps_summary ?? undefined,

            bspInternalInconsistencies: row.bsp_internal_inconsistencies ?? undefined,
            bspInternalInconsistenciesDetails: row.bsp_internal_inconsistencies_details,

            potentiallyOutdatedStrategies: row.potentially_outdated_strategies ?? undefined,
            potentiallyOutdatedStrategiesDetails:
              row.potentially_outdated_strategies_details,

            skillBuildingOpportunities: row.skill_building_opportunities ?? undefined,
            skillBuildingOpportunitiesDetails: row.skill_building_opportunities_details,

            riskRecurrenceRisk: row.risk_insights_recurrence_risk,
            riskEnvironmentalFactors: row.risk_insights_environmental_risk_factors ?? undefined,
            riskBehaviouralFactors: row.risk_insights_behavioural_risk_factors ?? undefined,
            riskMitigationSummary: row.risk_insights_risk_mitigation_summary,

            ndisComplianceLevel: row.ndis_compliance_assessment_compliance_level,
            ndisPersonCentredPractice: row.ndis_compliance_person_centred_practice ?? undefined,
            ndisPositiveBehaviourSupport: row.ndis_compliance_positive_behaviour_support ?? undefined,
            ndisRestrictivePractice: row.ndis_compliance_restrictive_practice ?? undefined,
            ndisEnvironmentSafety: row.ndis_compliance_environment_safety ?? undefined,
            ndisIncidentDocumentation: row.ndis_compliance_incident_documentation ?? undefined,

            createdAt: row.created_at ?? new Date(),
            updatedAt: row.updated_at ?? new Date(),
          },
        });
        map.set(row.id, created.id);
      } else {
        map.set(row.id, `<dry-run:bsp:${row.id}>`);
      }
      log.record("created");
    } catch (err) {
      log.fail(row.id, err instanceof Error ? err.message : String(err));
    }
  }

  await map.save(mode);
  return map;
}