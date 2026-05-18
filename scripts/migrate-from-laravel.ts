#!/usr/bin/env tsx
//
// Migrate data from the legacy Laravel-shaped database into the new
// Next.js + Prisma schema. Reads from LEGACY_DATABASE_URL (staging copy
// of live, restored from pg_dump) and writes to DATABASE_URL (the new
// app's DB).
//
// SAFETY:
//   - Defaults to dry-run. Pass --commit to actually write rows.
//   - Refuses to start if both DB URLs are the same.
//   - Refuses to start if LEGACY_DATABASE_URL is unset.
//   - Idempotent: id-maps in prisma/legacy/id-maps/ track what's been
//     migrated, so re-runs find existing rows instead of duplicating.
//
// USAGE:
//   tsx scripts/migrate-from-laravel.ts                # dry-run all translators
//   tsx scripts/migrate-from-laravel.ts --commit       # actually write
//   tsx scripts/migrate-from-laravel.ts --only orgs    # only one stage

import { disconnectAll } from "../src/lib/migration/clients";
import { IdMap } from "../src/lib/migration/id-map";
import { RunLog, type RunMode } from "../src/lib/migration/logger";

import {
  migrateProviderCompanies,
  migrateSCOrganisations,
} from "../src/lib/migration/translators/orgs";
import {
  migrateUsers,
  migrateSCUsers,
} from "../src/lib/migration/translators/users";
import { migrateWorkersFromParticipantWorker } from "../src/lib/migration/translators/workers";
import { migrateParticipants } from "../src/lib/migration/translators/participants";
import { migrateParticipantWorker } from "../src/lib/migration/translators/participant-worker";
import {
  migratePlans,
  migratePlanBudgets,
} from "../src/lib/migration/translators/plans";
import {
  migrateParticipantGoals,
  migrateParticipantPlanGoals,
} from "../src/lib/migration/translators/goals";
import { migrateIncidents } from "../src/lib/migration/translators/incidents";
import { migrateBSPAnalysisReports } from "../src/lib/migration/translators/bsp-reports";
import {
  migrateParticipantDocuments,
  migrateParticipantRecords,
  migrateCustomerDocuments,
} from "../src/lib/migration/translators/documents";
import {
  migrateSCProviderAccess,
  migrateSCParticipantAccess,
} from "../src/lib/migration/translators/sc-access";
import { migrateParticipantContacts } from "../src/lib/migration/translators/participant-contacts";
import {
  migrateParticipantNotes,
  migrateParticipantAlerts,
  migrateParticipantRisks,
} from "../src/lib/migration/translators/participant-clinical";

type Args = {
  mode: RunMode;
  only: string | null;
  help: boolean;
};

function parseArgs(argv: string[]): Args {
  const args: Args = { mode: "dry-run", only: null, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--commit") args.mode = "commit";
    else if (a === "--help" || a === "-h") args.help = true;
    else if (a === "--only") args.only = argv[++i] ?? null;
    else {
      console.error(`unknown argument: ${a}`);
      process.exit(2);
    }
  }
  return args;
}

function printHelp(): void {
  console.log(`
Migrate data from the legacy Laravel DB into the new Next.js DB.

Usage:
  tsx scripts/migrate-from-laravel.ts [--commit] [--only <stage>]

Flags:
  --commit          Actually write rows. Default is dry-run.
  --only <stage>    Run only one stage (see stage names in source).
  --help, -h        Show this message.

Env vars required:
  LEGACY_DATABASE_URL   Staging copy of legacy DB (NEVER live).
  DATABASE_URL          Target (new) DB.
`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  console.log("\n========================================");
  console.log("Providr legacy migration");
  console.log(`mode: ${args.mode.toUpperCase()}`);
  if (args.only) console.log(`only: ${args.only}`);
  console.log("========================================");
  if (args.mode === "dry-run") {
    console.log(
      "\n(dry-run — no rows will be written. Pass --commit to persist.)"
    );
  } else {
    console.log(
      `\n⚠️  COMMIT mode. Rows WILL be written to ${process.env.DATABASE_URL?.split("@")[1] ?? "DATABASE_URL"}.`
    );
  }

  const run = new RunLog(args.mode);

  // Shared id-maps that later stages need. Each stage that produces a
  // map either creates a new one or returns the existing one loaded
  // from disk.
  let providerOrgsMap: IdMap | null = null;
  let scOrgsMap: IdMap | null = null;
  let usersMap: IdMap | null = null;
  let participantsMap: IdMap | null = null;
  let workersMap: IdMap | null = null;
  let plansMap: IdMap | null = null;
  let incidentsMap: IdMap | null = null;
  let scConnectionsMap: IdMap | null = null;

  const want = (stage: string): boolean => !args.only || args.only === stage;

  try {
    // ─── stage 1: orgs ─────────────────────────────────────────────
    if (want("provider_companies")) {
      const log = run.translator("provider_companies");
      console.log("\n→ provider_companies");
      providerOrgsMap = await migrateProviderCompanies(log, args.mode);
      console.log("  " + log.summary());
    } else {
      providerOrgsMap = await IdMap.load("provider_companies", "Org");
    }
    if (want("sc_organisations")) {
      const log = run.translator("sc_organisations");
      console.log("\n→ sc_organisations");
      scOrgsMap = await migrateSCOrganisations(log, args.mode);
      console.log("  " + log.summary());
    } else {
      scOrgsMap = await IdMap.load("sc_organisations", "Org");
    }

    // ─── stage 2: users ───────────────────────────────────────────
    if (want("users")) {
      const log = run.translator("users");
      console.log("\n→ users");
      usersMap = await migrateUsers(log, args.mode, providerOrgsMap);
      console.log("  " + log.summary());
    } else {
      usersMap = await IdMap.load("users", "User");
    }
    if (want("sc_users")) {
      const log = run.translator("sc_users");
      console.log("\n→ sc_users");
      await migrateSCUsers(log, args.mode, scOrgsMap);
      console.log("  " + log.summary());
    }

    // ─── stage 3: participants ─────────────────────────────────────
    if (want("participants")) {
      const log = run.translator("participants");
      console.log("\n→ participants");
      participantsMap = await migrateParticipants(log, args.mode, providerOrgsMap);
      console.log("  " + log.summary());
    } else {
      participantsMap = await IdMap.load("participants", "Participant");
    }

    // ─── stage 4: workers (depend on orgs + participants) ─────────
    if (want("workers")) {
      const log = run.translator("workers");
      console.log("\n→ workers (from participant_worker)");
      workersMap = await migrateWorkersFromParticipantWorker(
        log,
        args.mode,
        providerOrgsMap
      );
      console.log("  " + log.summary());
    } else {
      workersMap = await IdMap.load("customers_as_workers", "Worker");
    }

    // ─── stage 5: participant_worker (join table) ─────────────────
    if (want("participant_worker")) {
      const log = run.translator("participant_worker");
      console.log("\n→ participant_worker");
      await migrateParticipantWorker(
        log,
        args.mode,
        workersMap,
        participantsMap,
        providerOrgsMap
      );
      console.log("  " + log.summary());
    }

    // ─── stage 6: plans + budgets ─────────────────────────────────
    if (want("plans")) {
      const log = run.translator("plans");
      console.log("\n→ plans");
      plansMap = await migratePlans(log, args.mode, participantsMap);
      console.log("  " + log.summary());
    } else {
      plansMap = await IdMap.load("participant_plans", "Plan");
    }
    if (want("plan_budgets")) {
      const log = run.translator("plan_budgets");
      console.log("\n→ plan_budgets");
      await migratePlanBudgets(log, args.mode, participantsMap, plansMap);
      console.log("  " + log.summary());
    }

    // ─── stage 7: goals ───────────────────────────────────────────
    if (want("participant_goals")) {
      const log = run.translator("participant_goals");
      console.log("\n→ participant_goals");
      await migrateParticipantGoals(log, args.mode, participantsMap);
      console.log("  " + log.summary());
    }
    if (want("participant_plan_goals")) {
      const log = run.translator("participant_plan_goals");
      console.log("\n→ participant_plan_goals");
      await migrateParticipantPlanGoals(log, args.mode, participantsMap);
      console.log("  " + log.summary());
    }

    // ─── stage 8: incidents + BSP reports ─────────────────────────
    if (want("incidents")) {
      const log = run.translator("incidents");
      console.log("\n→ incidents");
      incidentsMap = await migrateIncidents(
        log,
        args.mode,
        providerOrgsMap,
        participantsMap,
        usersMap
      );
      console.log("  " + log.summary());
    } else {
      incidentsMap = await IdMap.load("incidents", "Incident");
    }
    if (want("bsp_analysis_reports")) {
      const log = run.translator("bsp_analysis_reports");
      console.log("\n→ bsp_analysis_reports");
      await migrateBSPAnalysisReports(
        log,
        args.mode,
        providerOrgsMap,
        incidentsMap
      );
      console.log("  " + log.summary());
    }

    // ─── stage 9: documents ───────────────────────────────────────
    if (want("participant_documents")) {
      const log = run.translator("participant_documents");
      console.log("\n→ participant_documents");
      await migrateParticipantDocuments(log, args.mode, participantsMap);
      console.log("  " + log.summary());
    }
    if (want("participant_records")) {
      const log = run.translator("participant_records");
      console.log("\n→ participant_records");
      await migrateParticipantRecords(log, args.mode, participantsMap);
      console.log("  " + log.summary());
    }
    if (want("customer_documents")) {
      const log = run.translator("customer_documents");
      console.log("\n→ customer_documents");
      await migrateCustomerDocuments(
        log,
        args.mode,
        workersMap,
        participantsMap
      );
      console.log("  " + log.summary());
    }

    // ─── stage 10: SC access ──────────────────────────────────────
    if (want("sc_provider_access")) {
      const log = run.translator("sc_provider_access");
      console.log("\n→ sc_provider_access");
      scConnectionsMap = await migrateSCProviderAccess(
        log,
        args.mode,
        providerOrgsMap,
        scOrgsMap,
        usersMap
      );
      console.log("  " + log.summary());
    } else {
      scConnectionsMap = await IdMap.load("sc_provider_access", "SCConnection");
    }
    if (want("sc_participant_access")) {
      const log = run.translator("sc_participant_access");
      console.log("\n→ sc_participant_access");
      await migrateSCParticipantAccess(
        log,
        args.mode,
        participantsMap,
        scConnectionsMap
      );
      console.log("  " + log.summary());
    }

    // ─── stage 11: participant contacts + clinical detail ─────────
    if (want("participant_contacts")) {
      const log = run.translator("participant_contacts");
      console.log("\n→ participant_contacts");
      await migrateParticipantContacts(log, args.mode, participantsMap);
      console.log("  " + log.summary());
    }
    if (want("participant_notes")) {
      const log = run.translator("participant_notes");
      console.log("\n→ participant_notes");
      await migrateParticipantNotes(log, args.mode, participantsMap, usersMap);
      console.log("  " + log.summary());
    }
    if (want("participant_alerts")) {
      const log = run.translator("participant_alerts");
      console.log("\n→ participant_alerts");
      await migrateParticipantAlerts(log, args.mode, participantsMap, usersMap);
      console.log("  " + log.summary());
    }
    if (want("participant_risks")) {
      const log = run.translator("participant_risks");
      console.log("\n→ participant_risks");
      await migrateParticipantRisks(log, args.mode, participantsMap, usersMap);
      console.log("  " + log.summary());
    }
  } finally {
    await disconnectAll();
    run.print();
  }

  const anyFailures = run.translators.some((t) => t.failed > 0);
  process.exit(anyFailures ? 1 : 0);
}

main().catch((err) => {
  console.error("\nFATAL:", err);
  process.exit(1);
});