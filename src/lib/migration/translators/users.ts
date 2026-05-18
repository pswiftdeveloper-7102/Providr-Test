// users     → User + OrgMembership(provider org) [+ Account(google)]
// sc_users  → User + OrgMembership(sc org, role=SUPPORT_COORDINATOR)
//
// Both source tables can produce the same User row when an email
// exists in both — that user ends up with two OrgMembership rows.
// User is deduped on email (unique on target).
//
// Password hashes: Laravel bcrypt format is compatible with bcryptjs
// (which Auth.js + the new app already use), so passwords carry across
// without re-hashing. Users keep their existing credentials.
//
// google_id → Account row (provider="google"). Lets Auth.js find them
// when they "Continue with Google".
//
// Role translation (provider-side users.permission_* booleans):
//   admin=true                                    → OWNER
//   permission_editor || permission_intake        → CARE_MANAGER
//   permission_review || permission_incident_approver
//                                                 → COMPLIANCE_MANAGER
//   permission_billing                            → OFFICE_ADMIN
//   else                                          → SUPPORT_WORKER
//
// This heuristic is best-effort; we warn for every user so the org
// admins can review. The permission matrix (separate work item) will
// give us a more precise mapping.

import { source, target } from "../clients";
import { IdMap } from "../id-map";
import type { TranslatorLog, RunMode } from "../logger";

import type { OrgRole } from "@prisma/client";

function deriveOrgRoles(u: {
  admin: boolean;
  permission_editor: boolean;
  permission_review: boolean;
  permission_billing: boolean;
  permission_intake: boolean;
  permission_incident_approver: boolean | null;
}): OrgRole[] {
  if (u.admin) return ["OWNER"];
  const roles: OrgRole[] = [];
  if (u.permission_editor || u.permission_intake) roles.push("CARE_MANAGER");
  if (u.permission_review || u.permission_incident_approver) roles.push("COMPLIANCE_MANAGER");
  if (u.permission_billing) roles.push("OFFICE_ADMIN");
  return roles.length > 0 ? roles : ["SUPPORT_WORKER"];
}

async function findOrCreateUserByEmail(
  data: {
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    passwordHash: string;
    googleId: string | null;
    createdAt: Date | null;
  },
  mode: RunMode
): Promise<{ id: string; existed: boolean }> {
  const email = data.email.trim().toLowerCase();
  const existing = await target.user.findUnique({ where: { email } });
  if (existing) return { id: existing.id, existed: true };

  if (mode === "dry-run") {
    return { id: `<dry-run:user:${email}>`, existed: false };
  }

  const created = await target.user.create({
    data: {
      email,
      firstName: data.firstName,
      lastName: data.lastName,
      name: [data.firstName, data.lastName].filter(Boolean).join(" ") || null,
      phone: data.phone,
      passwordHash: data.passwordHash,
      createdAt: data.createdAt ?? new Date(),
      ...(data.googleId
        ? {
            accounts: {
              create: {
                type: "oauth",
                provider: "google",
                providerAccountId: data.googleId,
              },
            },
          }
        : {}),
    },
  });
  return { id: created.id, existed: false };
}

async function upsertMembership(
  userId: string,
  orgId: string,
  roles: OrgRole[],
  joinedAt: Date,
  mode: RunMode
): Promise<void> {
  if (mode === "dry-run") return;
  await target.orgMembership.upsert({
    where: { userId_orgId: { userId, orgId } },
    update: { roles: { set: roles } },
    create: { userId, orgId, roles, joinedAt },
  });
}

export async function migrateUsers(
  log: TranslatorLog,
  mode: RunMode,
  providerOrgsMap: IdMap
): Promise<IdMap> {
  const map = await IdMap.load("users", "User");
  const rows = await source.users.findMany({ orderBy: { id: "asc" } });

  for (const row of rows) {
    try {
      if (map.has(row.id)) {
        log.record("skipped");
        continue;
      }

      const orgId = providerOrgsMap.get(row.provider_company_id);
      if (!orgId) {
        // Legacy data integrity: ~28 users in the live DB have
        // provider_company_id pointing at companies that have been
        // deleted (dangling FK). These users have no org to belong
        // to in the new system. Skip with a warning rather than
        // creating an orphaned User row.
        log.warn(
          `users(${row.id}) ${row.email} → provider_company_id=${row.provider_company_id} doesn't exist in provider_companies (dangling legacy FK) — user skipped`
        );
        log.record("skipped");
        continue;
      }

      const roles = deriveOrgRoles({
        admin: row.admin,
        permission_editor: row.permission_editor,
        permission_review: row.permission_review,
        permission_billing: row.permission_billing,
        permission_intake: row.permission_intake,
        permission_incident_approver: row.permission_incident_approver,
      });
      log.warn(
        `users(${row.id}) ${row.email} → roles=${roles.join(",")} (review)`
      );

      const { id: userId, existed } = await findOrCreateUserByEmail(
        {
          email: row.email,
          firstName: row.first_name,
          lastName: row.last_name,
          phone: row.phone,
          passwordHash: row.password,
          googleId: row.google_id,
          createdAt: row.created_at,
        },
        mode
      );

      await upsertMembership(
        userId,
        orgId,
        roles,
        row.created_at ?? new Date(),
        mode
      );

      map.set(row.id, userId);
      log.record(existed ? "remapped" : "created");
    } catch (err) {
      log.fail(row.id, err instanceof Error ? err.message : String(err));
    }
  }

  await map.save();
  return map;
}

export async function migrateSCUsers(
  log: TranslatorLog,
  mode: RunMode,
  scOrgsMap: IdMap
): Promise<IdMap> {
  const map = await IdMap.load("sc_users", "User");
  const rows = await source.sc_users.findMany({ orderBy: { id: "asc" } });

  for (const row of rows) {
    try {
      if (map.has(row.id)) {
        log.record("skipped");
        continue;
      }

      const orgId = scOrgsMap.get(row.sc_org_id);
      if (!orgId) {
        log.fail(
          row.id,
          `sc_org_id=${row.sc_org_id} not in sc_organisations id-map — run sc_organisations first`
        );
        continue;
      }

      // SC users are always SUPPORT_COORDINATOR. Some SCs may also be
      // org owners (the live `sc_users.role` field has "owner" vs
      // "member"); we map "owner" to [SUPPORT_COORDINATOR, OWNER].
      const roles: OrgRole[] =
        row.role === "owner"
          ? ["OWNER", "SUPPORT_COORDINATOR"]
          : ["SUPPORT_COORDINATOR"];

      const { id: userId, existed } = await findOrCreateUserByEmail(
        {
          email: row.email,
          firstName: row.first_name,
          lastName: row.last_name ?? null,
          phone: row.phone ?? null,
          passwordHash: row.password,
          googleId: null,
          createdAt: row.created_at,
        },
        mode
      );

      await upsertMembership(
        userId,
        orgId,
        roles,
        row.created_at ?? new Date(),
        mode
      );

      map.set(row.id, userId);
      log.record(existed ? "remapped" : "created");
    } catch (err) {
      log.fail(row.id, err instanceof Error ? err.message : String(err));
    }
  }

  await map.save();
  return map;
}