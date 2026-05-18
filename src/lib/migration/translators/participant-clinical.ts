// participant_notes  → ParticipantNote
// participant_alerts → ParticipantAlert
// participant_risks  → ParticipantRisk
//
// Three small translators bundled together — same shape, all attach
// directly to Participant.

import type {
  ParticipantAlertSeverity,
  RiskLikelihood,
  RiskConsequence,
  RiskStatus,
} from "@prisma/client";

import { source, target } from "../clients";
import { IdMap } from "../id-map";
import type { TranslatorLog, RunMode } from "../logger";

function mapAlertSeverity(raw: string | null): ParticipantAlertSeverity {
  const s = (raw ?? "").toLowerCase();
  if (s.includes("high") || s.includes("critical") || s.includes("danger"))
    return "HIGH";
  if (s.includes("med")) return "MEDIUM";
  if (s.includes("low")) return "LOW";
  return "INFO";
}

function mapLikelihood(raw: string | null): RiskLikelihood {
  const s = (raw ?? "").toLowerCase();
  if (s.includes("rare")) return "RARE";
  if (s.includes("unlikely")) return "UNLIKELY";
  if (s.includes("possible")) return "POSSIBLE";
  if (s.includes("likely") && !s.includes("unlikely")) return "LIKELY";
  if (s.includes("almost") || s.includes("certain")) return "ALMOST_CERTAIN";
  return "POSSIBLE";
}

function mapConsequence(raw: string | null): RiskConsequence {
  const s = (raw ?? "").toLowerCase();
  if (s.includes("insig")) return "INSIGNIFICANT";
  if (s.includes("minor")) return "MINOR";
  if (s.includes("moderate")) return "MODERATE";
  if (s.includes("major")) return "MAJOR";
  if (s.includes("catastr")) return "CATASTROPHIC";
  return "MODERATE";
}

function mapRiskStatus(raw: string | null): RiskStatus {
  const s = (raw ?? "").toLowerCase();
  if (s.includes("mitig") || s.includes("resolved")) return "MITIGATED";
  if (s.includes("archiv") || s.includes("closed")) return "ARCHIVED";
  return "ACTIVE";
}

export async function migrateParticipantNotes(
  log: TranslatorLog,
  mode: RunMode,
  participantsMap: IdMap,
  usersMap: IdMap
): Promise<IdMap> {
  const map = await IdMap.load("participant_notes", "ParticipantNote");
  const rows = await source.participant_notes.findMany({ orderBy: { id: "asc" } });

  for (const row of rows) {
    try {
      if (map.has(row.id)) {
        log.record("skipped");
        continue;
      }
      const participantId = participantsMap.get(row.participant_id);
      if (!participantId) {
        log.fail(row.id, `participant ${row.participant_id} not in id-map`);
        continue;
      }
      const authorId = row.author_id ? usersMap.get(row.author_id) ?? null : null;

      if (mode === "commit") {
        const created = await target.participantNote.create({
          data: {
            participantId,
            authorId,
            body: row.content,
            createdAt: row.created_at ?? new Date(),
            updatedAt: row.updated_at ?? new Date(),
          },
        });
        map.set(row.id, created.id);
      } else {
        map.set(row.id, `<dry-run:pnote:${row.id}>`);
      }
      log.record("created");
    } catch (err) {
      log.fail(row.id, err instanceof Error ? err.message : String(err));
    }
  }

  await map.save();
  return map;
}

export async function migrateParticipantAlerts(
  log: TranslatorLog,
  mode: RunMode,
  participantsMap: IdMap,
  usersMap: IdMap
): Promise<IdMap> {
  const map = await IdMap.load("participant_alerts", "ParticipantAlert");
  const rows = await source.participant_alerts.findMany({ orderBy: { id: "asc" } });

  for (const row of rows) {
    try {
      if (map.has(row.id)) {
        log.record("skipped");
        continue;
      }
      const participantId = participantsMap.get(row.participant_id);
      if (!participantId) {
        log.fail(row.id, `participant ${row.participant_id} not in id-map`);
        continue;
      }
      const createdById = row.created_by_id
        ? usersMap.get(row.created_by_id) ?? null
        : null;

      if (mode === "commit") {
        const created = await target.participantAlert.create({
          data: {
            participantId,
            title: row.title,
            description: row.description,
            severity: mapAlertSeverity(row.severity),
            isActive: row.is_active,
            createdById,
            createdAt: row.created_at ?? new Date(),
            updatedAt: row.updated_at ?? new Date(),
          },
        });
        map.set(row.id, created.id);
      } else {
        map.set(row.id, `<dry-run:palert:${row.id}>`);
      }
      log.record("created");
    } catch (err) {
      log.fail(row.id, err instanceof Error ? err.message : String(err));
    }
  }

  await map.save();
  return map;
}

export async function migrateParticipantRisks(
  log: TranslatorLog,
  mode: RunMode,
  participantsMap: IdMap,
  usersMap: IdMap
): Promise<IdMap> {
  const map = await IdMap.load("participant_risks", "ParticipantRisk");
  const rows = await source.participant_risks.findMany({ orderBy: { id: "asc" } });

  for (const row of rows) {
    try {
      if (map.has(row.id)) {
        log.record("skipped");
        continue;
      }
      const participantId = participantsMap.get(row.participant_id);
      if (!participantId) {
        log.fail(row.id, `participant ${row.participant_id} not in id-map`);
        continue;
      }
      const createdById = row.created_by_id
        ? usersMap.get(row.created_by_id) ?? null
        : null;

      if (mode === "commit") {
        const created = await target.participantRisk.create({
          data: {
            participantId,
            title: row.title,
            category: row.category,
            description: row.description,
            likelihood: mapLikelihood(row.likelihood),
            consequence: mapConsequence(row.consequence),
            riskLevel: row.risk_level,
            mitigationStrategy: row.mitigation_strategy,
            reviewDate: row.review_date,
            status: mapRiskStatus(row.status),
            createdById,
            createdAt: row.created_at ?? new Date(),
            updatedAt: row.updated_at ?? new Date(),
          },
        });
        map.set(row.id, created.id);
      } else {
        map.set(row.id, `<dry-run:prisk:${row.id}>`);
      }
      log.record("created");
    } catch (err) {
      log.fail(row.id, err instanceof Error ? err.message : String(err));
    }
  }

  await map.save();
  return map;
}