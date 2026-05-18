// Source + target Prisma client wiring for the legacy migration.
//
// - `source` reads from LEGACY_DATABASE_URL (a STAGING COPY of the live
//   Laravel-shaped DB, restored from pg_dump — never live).
// - `target` writes to DATABASE_URL (the new Next.js app's DB).
//
// Lazy-initialised so `--help` and other arg-only commands work without
// requiring env vars. The first property access on `source` or `target`
// triggers the safety checks and client construction.

import { PrismaClient as LegacyPrismaClient } from "@prisma/client-legacy";
import { PrismaClient as TargetPrismaClient } from "@prisma/client";

let _source: LegacyPrismaClient | null = null;
let _target: TargetPrismaClient | null = null;

function assertSafeConfig(): void {
  if (!process.env.LEGACY_DATABASE_URL) {
    throw new Error(
      "LEGACY_DATABASE_URL is not set. Point it at a staging copy of the legacy DB (NEVER at the live DB)."
    );
  }
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Point it at the target (new) DB."
    );
  }
  // Same-URL safety check — refuses unless the operator has explicitly
  // opted in. The single-DB strategy (live Supabase has both legacy
  // Laravel tables AND the new Prisma tables) is a legitimate use case
  // for matching URLs, but it's easy to do by accident in dev.
  if (
    process.env.LEGACY_DATABASE_URL === process.env.DATABASE_URL &&
    process.env.MIGRATE_ALLOW_SAME_DB !== "yes-i-know"
  ) {
    throw new Error(
      "LEGACY_DATABASE_URL and DATABASE_URL point at the same database. " +
        "Refusing to run. Set MIGRATE_ALLOW_SAME_DB=yes-i-know to bypass " +
        "(intentional only for the in-place single-DB migration strategy)."
    );
  }
}

export const source = new Proxy({} as LegacyPrismaClient, {
  get(_obj, prop) {
    if (!_source) {
      assertSafeConfig();
      _source = new LegacyPrismaClient({ log: ["warn", "error"] });
    }
    return _source[prop as keyof LegacyPrismaClient];
  },
});

export const target = new Proxy({} as TargetPrismaClient, {
  get(_obj, prop) {
    if (!_target) {
      assertSafeConfig();
      _target = new TargetPrismaClient({ log: ["warn", "error"] });
    }
    return _target[prop as keyof TargetPrismaClient];
  },
});

export async function disconnectAll(): Promise<void> {
  await Promise.allSettled([
    _source ? _source.$disconnect() : Promise.resolve(),
    _target ? _target.$disconnect() : Promise.resolve(),
  ]);
}