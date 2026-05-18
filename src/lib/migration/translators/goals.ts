// participant_goals       → Goal (attached to Participant, not CarePlan)
// participant_plan_goals  → Goal (same)
//
// Per Q4-a we relaxed Goal.carePlanId to optional and added an optional
// participantId. Existing legacy goals are migrated attached directly
// to the Participant; if/when a CarePlan is created for that
// participant later, the goals can be reattached at the app layer.
//
// Both source tables map to the same target Goal. They're tracked in
// separate id-maps so we can re-run each independently.
//
// Status mapping (live free-text → GoalStatus enum):
//   "In Progress" / "Active" / default → IN_PROGRESS
//   "Completed" / "Achieved"            → ACHIEVED
//   "Paused" / "On hold"                → PAUSED
//   "Dropped" / "Cancelled"             → DROPPED
//
// Category mapping (legacy goal_type free-text → GoalCategory):
//   Best-effort substring match. Unknown → OTHER + warning.

import type { GoalStatus, GoalCategory } from "@prisma/client";

import { source, target } from "../clients";
import { IdMap } from "../id-map";
import type { TranslatorLog, RunMode } from "../logger";

function mapStatus(legacy: string | null | undefined): GoalStatus {
  const s = (legacy ?? "").toLowerCase().trim();
  if (s.includes("achiev") || s.includes("complet")) return "ACHIEVED";
  if (s.includes("paus") || s.includes("hold")) return "PAUSED";
  if (s.includes("drop") || s.includes("cancel")) return "DROPPED";
  return "IN_PROGRESS";
}

function mapCategory(legacy: string | null | undefined): GoalCategory | null {
  if (!legacy) return null;
  const s = legacy.toLowerCase();
  if (s.includes("social")) return "SOCIAL";
  if (s.includes("physical") || s.includes("health") || s.includes("fitness"))
    return "PHYSICAL";
  if (s.includes("commun")) return "COMMUNICATION";
  if (s.includes("independent") || s.includes("daily living"))
    return "INDEPENDENT_LIVING";
  if (s.includes("community")) return "COMMUNITY_PARTICIPATION";
  if (s.includes("employ") || s.includes("work")) return "EMPLOYMENT";
  return null;
}

export async function migrateParticipantGoals(
  log: TranslatorLog,
  mode: RunMode,
  participantsMap: IdMap
): Promise<IdMap> {
  const map = await IdMap.load("participant_goals", "Goal");
  const rows = await source.participant_goals.findMany({ orderBy: { id: "asc" } });

  for (const row of rows) {
    try {
      if (map.has(row.id)) {
        log.record("skipped");
        continue;
      }
      const participantId = participantsMap.get(row.participant_id);
      if (!participantId) {
        if (participantsMap.isSkipped(row.participant_id)) {
          log.record("skipped");
          continue;
        }
        log.fail(row.id, `participant ${row.participant_id} not in id-map`);
        continue;
      }

      const category = mapCategory(row.goal_type);
      if (row.goal_type && !category) {
        log.warn(
          `participant_goals(${row.id}) goal_type="${row.goal_type}" → OTHER (no match)`
        );
      }

      const description = [row.description, row.strategies, row.barriers]
        .filter(Boolean)
        .join("\n\n---\n\n");

      if (mode === "commit") {
        const created = await target.goal.create({
          data: {
            participantId,
            carePlanId: null, // Q8 — no CarePlans yet
            title: row.goal_name,
            description: description || null,
            category: category ?? "OTHER",
            status: mapStatus(row.status),
            createdAt: row.created_at ?? new Date(),
          },
        });
        map.set(row.id, created.id);
      } else {
        map.set(row.id, `<dry-run:goal:${row.id}>`);
      }
      log.record("created");
    } catch (err) {
      log.fail(row.id, err instanceof Error ? err.message : String(err));
    }
  }

  await map.save();
  return map;
}

export async function migrateParticipantPlanGoals(
  log: TranslatorLog,
  mode: RunMode,
  participantsMap: IdMap
): Promise<IdMap> {
  const map = await IdMap.load("participant_plan_goals", "Goal");
  const rows = await source.participant_plan_goals.findMany({
    orderBy: { id: "asc" },
  });

  for (const row of rows) {
    try {
      if (map.has(row.id)) {
        log.record("skipped");
        continue;
      }
      const participantId = participantsMap.get(row.participant_id);
      if (!participantId) {
        if (participantsMap.isSkipped(row.participant_id)) {
          log.record("skipped");
          continue;
        }
        log.fail(row.id, `participant ${row.participant_id} not in id-map`);
        continue;
      }

      const category = mapCategory(row.support_category);

      if (mode === "commit") {
        const created = await target.goal.create({
          data: {
            participantId,
            carePlanId: null,
            title: row.goal_text,
            description: null,
            category: category ?? "OTHER",
            status: mapStatus(row.status),
            evidenceSummary: row.progress_notes,
            createdAt: row.created_at ?? new Date(),
          },
        });
        map.set(row.id, created.id);
      } else {
        map.set(row.id, `<dry-run:plangoal:${row.id}>`);
      }
      log.record("created");
    } catch (err) {
      log.fail(row.id, err instanceof Error ? err.message : String(err));
    }
  }

  await map.save();
  return map;
}