// customers (rows referenced by participant_worker.worker_id) → Worker
//
// The legacy `customers` table is dual-purpose: it holds both support
// workers (via participant_worker.worker_id) and assigned practitioners
// (via participants.assigned_practitioner_id). This translator handles
// only the support-worker uses; practitioners (allied health, behaviour
// support) are migrated later by a separate pass if needed.
//
// A customer may be assigned to participants across multiple provider
// orgs. The new Worker model is per-org (`Worker.orgId`), so one source
// customer can yield multiple Worker rows — one per org. Idempotent via
// a composite (customerId, orgId) key in the id-map.
//
// Per Q10, existing workers have no logins on the new system, so all
// Worker.userId fields are left null. The new app's invite flow links
// User to Worker when the worker accepts an invite later.
//
// Worker.type defaults to SUPPORT_WORKER (no signal in source); the
// org can reclassify later.

import { source, target } from "../clients";
import { IdMap } from "../id-map";
import type { TranslatorLog, RunMode } from "../logger";

function composite(customerId: bigint, orgId: string): string {
  return `${customerId}::${orgId}`;
}

export async function migrateWorkersFromParticipantWorker(
  log: TranslatorLog,
  mode: RunMode,
  providerOrgsMap: IdMap
): Promise<IdMap> {
  // Composite-key id-map: "customerId::orgId" → workerId
  const map = await IdMap.load("customers_as_workers", "Worker");

  // Pull every participant_worker row with its participant (for org).
  // For real-prod scale we'd batch; v1 of the script is a single pass.
  const rows = await source.participant_worker.findMany({
    include: { participants: { select: { provider_company_id: true } } },
    orderBy: { id: "asc" },
  });

  // Dedupe to unique (customer, org) pairs and remember a representative
  // participant_worker row for created_at.
  const uniquePairs = new Map<
    string,
    { customerId: bigint; orgId: string; createdAt: Date | null }
  >();
  for (const pw of rows) {
    const legacyOrgId = pw.participants.provider_company_id;
    const orgId = providerOrgsMap.get(legacyOrgId);
    if (!orgId) {
      log.fail(
        pw.id,
        `participant ${pw.participant_id} → provider_company_id=${legacyOrgId} not in orgs id-map`
      );
      continue;
    }
    const key = composite(pw.worker_id, orgId);
    if (!uniquePairs.has(key)) {
      uniquePairs.set(key, {
        customerId: pw.worker_id,
        orgId,
        createdAt: pw.created_at,
      });
    }
  }

  // Process each unique pair.
  for (const [key, pair] of uniquePairs) {
    try {
      if (map.has(key)) {
        log.record("skipped");
        continue;
      }

      const customer = await source.customers.findUnique({
        where: { id: pair.customerId },
      });
      if (!customer) {
        log.fail(
          pair.customerId,
          `customer ${pair.customerId} not found in source DB`
        );
        continue;
      }

      // Existing-record check: a Worker may already exist in this org
      // with the same email (e.g. seeded manually).
      let existingId: string | null = null;
      if (customer.email) {
        const found = await target.worker.findFirst({
          where: { orgId: pair.orgId, email: customer.email },
        });
        existingId = found?.id ?? null;
      }

      if (existingId) {
        map.set(key, existingId);
        log.record("remapped");
        continue;
      }

      if (mode === "commit") {
        const created = await target.worker.create({
          data: {
            orgId: pair.orgId,
            userId: null, // per Q10 — workers have no logins yet
            firstName: customer.first_name,
            lastName: customer.last_name ?? "",
            email: customer.email,
            phone: customer.phone,
            type: "SUPPORT_WORKER",
            createdAt: pair.createdAt ?? customer.created_at ?? new Date(),
          },
        });
        map.set(key, created.id);
      } else {
        map.set(key, `<dry-run:worker:${key}>`);
      }
      log.record("created");
    } catch (err) {
      log.fail(
        pair.customerId,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  await map.save();
  return map;
}