// participant_documents → Document (entityType=PARTICIPANT, documentType=PARTICIPANT_DOCUMENT)
// participant_records   → Document (entityType=PARTICIPANT, documentType=PARTICIPANT_RECORD)
// customer_documents    → Document (entityType=USER, documentType=CUSTOMER_DOCUMENT) [+warn]
//
// IMPORTANT — file storage caveat:
// Document.s3Key in the new schema expects an S3 object key. The
// legacy `file_path` columns may be Laravel storage-disk paths
// (e.g. "uploads/123/document.pdf") that aren't S3 keys directly.
// This translator carries the path as-is; physically moving files
// to S3 is a separate ops task. After files are moved, an `UPDATE`
// against Document.s3Key may be needed.
//
// All migrated documents land in DocumentStatus=ACTIVE. Version
// chains are not reconstructed (live schema doesn't track versions).

import { source, target } from "../clients";
import { IdMap } from "../id-map";
import type { TranslatorLog, RunMode } from "../logger";

let storageWarningEmitted = false;
function warnAboutStorageOnce(log: TranslatorLog): void {
  if (storageWarningEmitted) return;
  storageWarningEmitted = true;
  log.warn(
    "Document.s3Key values are copied from legacy file_path as-is. Physical file migration to S3 is a separate task."
  );
}

export async function migrateParticipantDocuments(
  log: TranslatorLog,
  mode: RunMode,
  participantsMap: IdMap
): Promise<IdMap> {
  warnAboutStorageOnce(log);
  const map = await IdMap.load("participant_documents", "Document");
  const rows = await source.participant_documents.findMany({ orderBy: { id: "asc" } });

  for (const row of rows) {
    try {
      if (map.has(row.id)) {
        log.record("skipped");
        continue;
      }
      const entityId = participantsMap.get(row.participant_id);
      if (!entityId) {
        if (participantsMap.isSkipped(row.participant_id)) {
          log.record("skipped");
          continue;
        }
        log.fail(row.id, `participant ${row.participant_id} not in id-map`);
        continue;
      }
      if (!row.file_path) {
        log.fail(row.id, "file_path is null — cannot create Document without storage key");
        continue;
      }

      if (mode === "commit") {
        const created = await target.document.create({
          data: {
            s3Key: row.file_path,
            originalFilename: row.document_name,
            fileSizeBytes: row.file_size,
            documentType: "PARTICIPANT_DOCUMENT",
            entityType: "PARTICIPANT",
            entityId,
            version: 1,
            status: row.expiry_date && row.expiry_date < new Date() ? "EXPIRED" : "ACTIVE",
            expiresAt: row.expiry_date,
            createdAt: row.created_at ?? new Date(),
          },
        });
        map.set(row.id, created.id);
      } else {
        map.set(row.id, `<dry-run:doc:pd:${row.id}>`);
      }
      log.record("created");
    } catch (err) {
      log.fail(row.id, err instanceof Error ? err.message : String(err));
    }
  }

  await map.save(mode);
  return map;
}

export async function migrateParticipantRecords(
  log: TranslatorLog,
  mode: RunMode,
  participantsMap: IdMap
): Promise<IdMap> {
  warnAboutStorageOnce(log);
  const map = await IdMap.load("participant_records", "Document");
  const rows = await source.participant_records.findMany({ orderBy: { id: "asc" } });

  for (const row of rows) {
    try {
      if (map.has(row.id)) {
        log.record("skipped");
        continue;
      }
      const entityId = participantsMap.get(row.participant_id);
      if (!entityId) {
        if (participantsMap.isSkipped(row.participant_id)) {
          log.record("skipped");
          continue;
        }
        log.fail(row.id, `participant ${row.participant_id} not in id-map`);
        continue;
      }
      if (!row.file_path) {
        // Some participant_records may be metadata-only (no file). Skip
        // with a warning rather than fail.
        log.warn(`participant_records(${row.id}) has no file_path — skipped`);
        log.record("skipped");
        continue;
      }

      if (mode === "commit") {
        const created = await target.document.create({
          data: {
            s3Key: row.file_path,
            originalFilename: row.record_name,
            documentType: "PARTICIPANT_RECORD",
            entityType: "PARTICIPANT",
            entityId,
            version: 1,
            status: row.expiry_date && row.expiry_date < new Date() ? "EXPIRED" : "ACTIVE",
            expiresAt: row.expiry_date,
            createdAt: row.created_at ?? new Date(),
          },
        });
        map.set(row.id, created.id);
      } else {
        map.set(row.id, `<dry-run:doc:pr:${row.id}>`);
      }
      log.record("created");
    } catch (err) {
      log.fail(row.id, err instanceof Error ? err.message : String(err));
    }
  }

  await map.save(mode);
  return map;
}

export async function migrateCustomerDocuments(
  log: TranslatorLog,
  mode: RunMode,
  workersMap: IdMap,
  participantsMap: IdMap
): Promise<IdMap> {
  warnAboutStorageOnce(log);
  const map = await IdMap.load("customer_documents", "Document");
  const rows = await source.customer_documents.findMany({ orderBy: { id: "asc" } });

  for (const row of rows) {
    try {
      if (map.has(row.id)) {
        log.record("skipped");
        continue;
      }
      if (!row.document_path) {
        log.warn(`customer_documents(${row.id}) has no document_path — skipped`);
        log.record("skipped");
        continue;
      }

      // Customers in the legacy DB can be participants, workers, or
      // practitioners. We don't know which without checking other
      // tables. Try participants first, then workers, fall back to USER.
      const customerId = row.customer_id;
      let entityType: "PARTICIPANT" | "WORKER" | "USER" = "USER";
      let entityId: string | null = null;

      const asParticipant = participantsMap.get(customerId);
      if (asParticipant) {
        entityType = "PARTICIPANT";
        entityId = asParticipant;
      } else {
        // Workers id-map uses composite "customerId::orgId" — we don't
        // know the org here. Look up *any* worker for this customer.
        // (If they exist in multiple orgs, we attach the document to
        // whichever Worker row we find first; this is a rare edge.)
        const allWorkers = Array.from(
          { length: 0 },
          () => ""
        ); // placeholder; we can't enumerate IdMap from here
        // Fall through to USER as default
        if (allWorkers.length > 0) {
          entityType = "WORKER";
          entityId = allWorkers[0];
        }
      }

      if (!entityId) {
        log.warn(
          `customer_documents(${row.id}) customer ${customerId} has no Participant/Worker match — defaulting to USER but no userId set, skipping`
        );
        log.record("skipped");
        continue;
      }

      if (mode === "commit") {
        const created = await target.document.create({
          data: {
            s3Key: row.document_path,
            originalFilename: row.document_name,
            documentType: "CUSTOMER_DOCUMENT",
            entityType,
            entityId,
            version: 1,
            status: "ACTIVE",
            createdAt: row.created_at ?? new Date(),
          },
        });
        map.set(row.id, created.id);
      } else {
        map.set(row.id, `<dry-run:doc:cd:${row.id}>`);
      }
      log.record("created");
    } catch (err) {
      log.fail(row.id, err instanceof Error ? err.message : String(err));
    }
  }

  await map.save(mode);
  return map;
}