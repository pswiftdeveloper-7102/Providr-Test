// participant_worker → WorkerParticipant
//
// Join table. Needs both workers id-map (composite "customerId::orgId"
// key) and participants id-map. The org of each row is derived from
// the participant (since Worker is per-org).

import { source, target } from "../clients";
import { IdMap } from "../id-map";
import type { TranslatorLog, RunMode } from "../logger";

export async function migrateParticipantWorker(
  log: TranslatorLog,
  mode: RunMode,
  workersMap: IdMap,
  participantsMap: IdMap,
  providerOrgsMap: IdMap
): Promise<void> {
  const rows = await source.participant_worker.findMany({
    include: { participants: { select: { provider_company_id: true } } },
    orderBy: { id: "asc" },
  });

  for (const row of rows) {
    try {
      const orgId = providerOrgsMap.get(row.participants.provider_company_id);
      if (!orgId) {
        log.fail(row.id, `org not in id-map for participant ${row.participant_id}`);
        continue;
      }

      const workerKey = `${row.worker_id}::${orgId}`;
      const workerId = workersMap.get(workerKey);
      if (!workerId) {
        log.fail(
          row.id,
          `worker not in id-map (key=${workerKey}) — run workers translator first`
        );
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

      if (mode === "commit") {
        await target.workerParticipant.upsert({
          where: {
            workerId_participantId: { workerId, participantId },
          },
          update: {},
          create: {
            workerId,
            participantId,
            createdAt: row.created_at ?? new Date(),
          },
        });
      }
      log.record("created");
    } catch (err) {
      log.fail(row.id, err instanceof Error ? err.message : String(err));
    }
  }
}