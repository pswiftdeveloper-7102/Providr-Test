// provider_companies → Org (+ OrgEntitlement{PROVIDER})
// sc_organisations   → Org (+ OrgEntitlement{SC})
//
// Two source tables become rows in the same target table. Each Org also
// gets an OrgEntitlement row so the new app knows which portals the org
// has access to. Same-ABN match across the two sources triggers a
// hybrid (same Org gets both entitlements).
//
// Dedupe rules:
//   - Match on Org.abn (unique) when present.
//   - Fall back to legacyId via id-map for re-runs.
//
// Dropped (per client answer #2):
//   - Marketing fields (logo, description, photo_gallery, social URLs)
//   - Brand colours, PWA app name/subtitle, claim_email
//
// Lossy → warned via translator log:
//   - sc_organisations.contact_email has no Org target field.

import { source, target } from "../clients";
import { IdMap } from "../id-map";
import type { TranslatorLog, RunMode } from "../logger";

function normaliseAbn(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.replace(/\s+/g, "");
  return trimmed.length === 11 ? trimmed : null;
}

export async function migrateProviderCompanies(
  log: TranslatorLog,
  mode: RunMode
): Promise<IdMap> {
  const map = await IdMap.load("provider_companies", "Org");
  const rows = await source.provider_companies.findMany({
    orderBy: { id: "asc" },
  });

  for (const row of rows) {
    try {
      if (map.has(row.id)) {
        log.record("skipped");
        continue;
      }

      const abn = normaliseAbn(row.abn);

      // Existing-record check (idempotent re-run support)
      let existingId: string | null = null;
      if (abn) {
        const existing = await target.org.findUnique({ where: { abn } });
        existingId = existing?.id ?? null;
      }

      if (existingId) {
        if (mode === "commit") {
          // Ensure PROVIDER entitlement exists; safe upsert
          await target.orgEntitlement.upsert({
            where: { orgId_portal: { orgId: existingId, portal: "PROVIDER" } },
            update: {},
            create: {
              orgId: existingId,
              portal: "PROVIDER",
              active: true,
              startedAt: row.created_at ?? new Date(),
            },
          });
        }
        map.set(row.id, existingId);
        log.record("remapped");
        continue;
      }

      if (mode === "commit") {
        const created = await target.org.create({
          data: {
            legalName: row.name,
            tradingName: null,
            abn,
            ndisRegistrationNumber: null,
            createdAt: row.created_at ?? new Date(),
            entitlements: {
              create: {
                portal: "PROVIDER",
                active: true,
                startedAt: row.created_at ?? new Date(),
              },
            },
          },
        });
        map.set(row.id, created.id);
      } else {
        map.set(row.id, `<dry-run:${row.id}>`);
      }
      log.record("created");
    } catch (err) {
      log.fail(row.id, err instanceof Error ? err.message : String(err));
    }
  }

  await map.save();
  return map;
}

export async function migrateSCOrganisations(
  log: TranslatorLog,
  mode: RunMode
): Promise<IdMap> {
  const map = await IdMap.load("sc_organisations", "Org");
  const rows = await source.sc_organisations.findMany({
    orderBy: { id: "asc" },
  });

  for (const row of rows) {
    try {
      if (map.has(row.id)) {
        log.record("skipped");
        continue;
      }

      const abn = normaliseAbn(row.abn);
      let existingId: string | null = null;
      if (abn) {
        const existing = await target.org.findUnique({ where: { abn } });
        existingId = existing?.id ?? null;
      }

      if (existingId) {
        if (mode === "commit") {
          await target.orgEntitlement.upsert({
            where: { orgId_portal: { orgId: existingId, portal: "SC" } },
            update: {},
            create: {
              orgId: existingId,
              portal: "SC",
              active: row.is_active,
              startedAt: row.created_at ?? new Date(),
            },
          });
        }
        map.set(row.id, existingId);
        log.record("remapped");
        continue;
      }

      if (row.contact_email) {
        log.warn(
          `sc_organisations(${row.id}).contact_email (${row.contact_email}) not migrated — no Org target field`
        );
      }

      if (mode === "commit") {
        const created = await target.org.create({
          data: {
            legalName: row.name,
            tradingName: null,
            abn,
            ndisRegistrationNumber: null,
            createdAt: row.created_at ?? new Date(),
            entitlements: {
              create: {
                portal: "SC",
                active: row.is_active,
                startedAt: row.created_at ?? new Date(),
              },
            },
          },
        });
        map.set(row.id, created.id);
      } else {
        map.set(row.id, `<dry-run:sc:${row.id}>`);
      }
      log.record("created");
    } catch (err) {
      log.fail(row.id, err instanceof Error ? err.message : String(err));
    }
  }

  await map.save();
  return map;
}