// participant_plans         → Plan
// participant_plan_budgets  → PlanBudget (after NDIA category mapping)
//
// Source has one set of budgets per participant (keyed by participant_id
// + support_category_number, NOT keyed by plan). The new schema requires
// budgets to belong to a specific Plan. We attach each participant's
// budgets to that participant's most recent Plan (by start_date desc).
//
// NDIA support category → BudgetCategory mapping. Verified against the
// 2025-26 NDIS Pricing Arrangements and Price Limits (V1.0, p.13).
//   CORE:     01, 02, 03, 04          (legacy CRM)
//             16, 21                  (PACE additions: Home & Living, YPIRAC)
//   CAPITAL:  05, 06                  (legacy CRM)
//             17, 19                  (PACE: SDA, AT Maint. Repair & Rental)
//   CAPACITY: 07, 08, 09, 10, 11,
//             12, 13, 14, 15          (legacy CRM)
//             20                      (PACE: Behaviour Support)
//   18 (Recurring Transport) is its own RECURRING purpose per the NDIA
//   doc, not CORE/CAPACITY/CAPITAL. Not yet represented in our
//   BudgetCategory enum; rows with category 18 are skipped + warned.
//
// Decimal → cents: source is Decimal(12,2) AUD; new schema stores Int
// cents. Conversion is value * 100, rounded to nearest int.
//
// Plan end_date required in new schema; if source has null, we use
// start_date + 12 months (standard NDIS plan length).

import { Prisma } from "@prisma/client";

import { source, target } from "../clients";
import { IdMap } from "../id-map";
import type { TranslatorLog, RunMode } from "../logger";

type BudgetCategory = "CORE" | "CAPACITY" | "CAPITAL";

function categoryFor(supportCategoryNumber: string): BudgetCategory | null {
  const n = supportCategoryNumber.padStart(2, "0");
  // Legacy CRM categories 01-15
  if (["01", "02", "03", "04"].includes(n)) return "CORE";
  if (["05", "06"].includes(n)) return "CAPITAL";
  if (["07", "08", "09", "10", "11", "12", "13", "14", "15"].includes(n))
    return "CAPACITY";
  // PACE additions
  if (n === "16") return "CORE";    // Home and Living
  if (n === "17") return "CAPITAL"; // Specialised Disability Accommodation
  // 18 = Recurring Transport (separate RECURRING purpose — not yet
  // representable in BudgetCategory; returns null → warned + skipped).
  if (n === "19") return "CAPITAL"; // AT Maintenance Repair and Rental
  if (n === "20") return "CAPACITY"; // Behaviour Support
  if (n === "21") return "CORE"; // Young People in Residential Aged Care
  return null;
}

function decimalToCents(d: Prisma.Decimal | null | undefined): number {
  if (d === null || d === undefined) return 0;
  const dollars = typeof d === "number" ? d : Number(d.toString());
  return Math.round(dollars * 100);
}

function defaultEnd(start: Date): Date {
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);
  return end;
}

export async function migratePlans(
  log: TranslatorLog,
  mode: RunMode,
  participantsMap: IdMap
): Promise<IdMap> {
  const map = await IdMap.load("participant_plans", "Plan");
  const rows = await source.participant_plans.findMany({
    orderBy: [{ participant_id: "asc" }, { plan_start_date: "desc" }],
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
        log.fail(
          row.id,
          `participant ${row.participant_id} not in id-map — run participants first`
        );
        continue;
      }

      const startDate = row.plan_start_date ?? row.created_at ?? new Date();
      const endDate = row.plan_end_date ?? defaultEnd(startDate);
      const totalCents = decimalToCents(row.total_funded_supports);

      if (mode === "commit") {
        const created = await target.plan.create({
          data: {
            participantId,
            startDate,
            endDate,
            totalCents,
            status: endDate < new Date() ? "EXPIRED" : "ACTIVE",
            createdAt: row.created_at ?? new Date(),
          },
        });
        map.set(row.id, created.id);
      } else {
        map.set(row.id, `<dry-run:plan:${row.id}>`);
      }
      log.record("created");
    } catch (err) {
      log.fail(row.id, err instanceof Error ? err.message : String(err));
    }
  }

  await map.save(mode);
  return map;
}

export async function migratePlanBudgets(
  log: TranslatorLog,
  mode: RunMode,
  participantsMap: IdMap,
  plansMap: IdMap
): Promise<void> {
  // Group source budgets by participant
  const sourceBudgets = await source.participant_plan_budgets.findMany({
    orderBy: [{ participant_id: "asc" }, { support_category_number: "asc" }],
  });

  // Find each participant's most recent plan in source (so we can pick
  // the target Plan to attach budgets to).
  const planByParticipant = new Map<bigint, bigint>(); // participant_id → most-recent participant_plans.id
  const sourcePlans = await source.participant_plans.findMany({
    orderBy: { plan_start_date: "desc" },
    select: { id: true, participant_id: true, plan_start_date: true },
  });
  for (const p of sourcePlans) {
    if (!planByParticipant.has(p.participant_id)) {
      planByParticipant.set(p.participant_id, p.id);
    }
  }

  // Aggregate budgets by (target plan, BudgetCategory)
  type Bucket = {
    targetPlanId: string;
    category: BudgetCategory;
    totalCents: number;
    spentCents: number;
    sourceRowIds: bigint[];
  };
  const buckets = new Map<string, Bucket>(); // key = `${planId}|${category}`

  for (const b of sourceBudgets) {
    // Demo-participant budgets: silently skip (the parent participant
    // and its plans were intentionally not migrated).
    if (participantsMap.isSkipped(b.participant_id)) {
      log.record("skipped");
      continue;
    }
    const cat = categoryFor(b.support_category_number);
    if (!cat) {
      log.warn(
        `participant_plan_budgets(${b.id}) support_category_number=${b.support_category_number} not in NDIA mapping — skipped`
      );
      continue;
    }
    const legacyPlanId = planByParticipant.get(b.participant_id);
    if (!legacyPlanId) {
      // Two reasons we might land here:
      //   1. Participant was demo-skipped — silently skip the budget too.
      //   2. Participant is real but has budgets attached without any
      //      participant_plans row (orphaned legacy data). Warn + skip.
      if (participantsMap.isSkipped(b.participant_id)) {
        log.record("skipped");
      } else {
        log.warn(
          `participant_plan_budgets(${b.id}) participant ${b.participant_id} has no participant_plans row — orphaned legacy data, skipped`
        );
        log.record("skipped");
      }
      continue;
    }
    const targetPlanId = plansMap.get(legacyPlanId);
    if (!targetPlanId) {
      if (plansMap.isSkipped(legacyPlanId)) {
        log.record("skipped");
        continue;
      }
      log.fail(b.id, `plan ${legacyPlanId} not in id-map`);
      continue;
    }
    const key = `${targetPlanId}|${cat}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.totalCents += decimalToCents(b.allocated_amount);
      existing.spentCents += decimalToCents(b.spent_amount);
      existing.sourceRowIds.push(b.id);
    } else {
      buckets.set(key, {
        targetPlanId,
        category: cat,
        totalCents: decimalToCents(b.allocated_amount),
        spentCents: decimalToCents(b.spent_amount),
        sourceRowIds: [b.id],
      });
    }
  }

  // Write one row per (plan, category) bucket
  for (const [key, bucket] of buckets) {
    try {
      if (mode === "commit") {
        await target.planBudget.upsert({
          where: {
            planId_category: {
              planId: bucket.targetPlanId,
              category: bucket.category,
            },
          },
          update: {
            totalCents: bucket.totalCents,
            spentCents: bucket.spentCents,
          },
          create: {
            planId: bucket.targetPlanId,
            category: bucket.category,
            totalCents: bucket.totalCents,
            spentCents: bucket.spentCents,
          },
        });
      }
      log.record("created");
    } catch (err) {
      log.fail(key, err instanceof Error ? err.message : String(err));
    }
  }
}