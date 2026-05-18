// sc_provider_access     → SCConnection
// sc_participant_access  → SCParticipantAccess
//
// Pattern mirrors the live "Provider Connections" feature. Provider
// invites SC org → SC accepts → provider grants per-participant access.

import type {
  SCConnectionStatus,
  SCParticipantAccessType,
} from "@prisma/client";

import { source, target } from "../clients";
import { IdMap } from "../id-map";
import type { TranslatorLog, RunMode } from "../logger";

function mapConnectionStatus(raw: string | null): SCConnectionStatus {
  const s = (raw ?? "").toLowerCase();
  if (s.includes("active")) return "ACTIVE";
  if (s.includes("revok") || s.includes("remov")) return "REVOKED";
  if (s.includes("expir")) return "EXPIRED";
  return "PENDING";
}

function mapAccessType(raw: string | null): SCParticipantAccessType {
  const s = (raw ?? "").toLowerCase();
  if (s.includes("write") || s.includes("edit")) return "READ_WRITE";
  return "READ";
}

export async function migrateSCProviderAccess(
  log: TranslatorLog,
  mode: RunMode,
  providerOrgsMap: IdMap,
  scOrgsMap: IdMap,
  usersMap: IdMap
): Promise<IdMap> {
  const map = await IdMap.load("sc_provider_access", "SCConnection");
  const rows = await source.sc_provider_access.findMany({
    orderBy: { id: "asc" },
  });

  for (const row of rows) {
    try {
      if (map.has(row.id)) {
        log.record("skipped");
        continue;
      }

      const providerOrgId = providerOrgsMap.get(row.provider_company_id);
      if (!providerOrgId) {
        log.fail(row.id, `provider org not in id-map for provider_company_id=${row.provider_company_id}`);
        continue;
      }
      const scOrgId = row.sc_org_id ? scOrgsMap.get(row.sc_org_id) ?? null : null;
      const invitedByUserId = row.invited_by_user_id
        ? usersMap.get(row.invited_by_user_id) ?? null
        : null;

      const status = mapConnectionStatus(row.status);

      if (mode === "commit") {
        const created = await target.sCConnection.create({
          data: {
            providerOrgId,
            scOrgId,
            invitedByUserId,
            invitationEmail: row.invitation_email,
            invitationToken: row.invitation_token,
            invitationExpiresAt: row.invitation_expires_at,
            invitationNote: row.invitation_note,
            status,
            acceptedAt: status === "ACTIVE" ? row.updated_at : null,
            revokedAt: status === "REVOKED" ? row.updated_at : null,
            createdAt: row.created_at ?? new Date(),
          },
        });
        map.set(row.id, created.id);
      } else {
        map.set(row.id, `<dry-run:scconn:${row.id}>`);
      }
      log.record("created");
    } catch (err) {
      log.fail(row.id, err instanceof Error ? err.message : String(err));
    }
  }

  await map.save();
  return map;
}

export async function migrateSCParticipantAccess(
  log: TranslatorLog,
  mode: RunMode,
  participantsMap: IdMap,
  scConnectionsMap: IdMap
): Promise<void> {
  const rows = await source.sc_participant_access.findMany({
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
      const scConnectionId = scConnectionsMap.get(row.sc_provider_access_id);
      if (!scConnectionId) {
        log.fail(
          row.id,
          `SCConnection ${row.sc_provider_access_id} not in id-map — run sc_provider_access first`
        );
        continue;
      }

      if (mode === "commit") {
        await target.sCParticipantAccess.upsert({
          where: {
            scConnectionId_participantId: { scConnectionId, participantId },
          },
          update: {
            accessType: mapAccessType(row.access_type),
            expiresAt: row.expires_at,
            revokedAt: row.revoked_at,
          },
          create: {
            scConnectionId,
            participantId,
            accessType: mapAccessType(row.access_type),
            grantedAt: row.granted_at ?? new Date(),
            expiresAt: row.expires_at,
            revokedAt: row.revoked_at,
          },
        });
      }
      log.record("created");
    } catch (err) {
      log.fail(row.id, err instanceof Error ? err.message : String(err));
    }
  }
}