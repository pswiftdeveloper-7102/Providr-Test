// Translates legacy BigInt IDs (from the Laravel-shaped source DB) into
// the cuid strings used by the new schema. Persists to disk so re-runs
// of the migration script find existing mappings instead of duplicating
// records.
//
// One IdMap per (source table → target table) pair. Stored on disk as
// JSON at `prisma/legacy/id-maps/<source>__<target>.json`.
//
// Usage:
//   const map = await IdMap.load("provider_companies", "Org");
//   const targetCuid = map.get(legacyBigInt);
//   if (!targetCuid) {
//     const newCuid = createId();
//     map.set(legacyBigInt, newCuid);
//     // ... insert into target with id = newCuid
//   }
//   await map.save();
//
// BigInts are serialised as strings on disk (JSON doesn't have BigInt).

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const MAP_DIR = join(process.cwd(), "prisma", "legacy", "id-maps");

export class IdMap {
  private readonly path: string;
  private readonly entries: Map<string, string>;
  private dirty = false;

  private constructor(path: string, entries: Map<string, string>) {
    this.path = path;
    this.entries = entries;
  }

  static async load(sourceTable: string, targetModel: string): Promise<IdMap> {
    const path = join(MAP_DIR, `${sourceTable}__${targetModel}.json`);
    let entries = new Map<string, string>();
    try {
      const text = await readFile(path, "utf8");
      const parsed = JSON.parse(text) as Record<string, string>;
      entries = new Map(Object.entries(parsed));
    } catch (err: unknown) {
      // ENOENT is fine — first run. Other errors should bubble.
      if (
        !(err instanceof Error) ||
        !("code" in err) ||
        (err as { code?: string }).code !== "ENOENT"
      ) {
        throw err;
      }
    }
    return new IdMap(path, entries);
  }

  get(legacyId: bigint | number | string): string | undefined {
    return this.entries.get(String(legacyId));
  }

  has(legacyId: bigint | number | string): boolean {
    return this.entries.has(String(legacyId));
  }

  set(legacyId: bigint | number | string, targetCuid: string): void {
    const key = String(legacyId);
    if (this.entries.get(key) !== targetCuid) {
      this.entries.set(key, targetCuid);
      this.dirty = true;
    }
  }

  size(): number {
    return this.entries.size;
  }

  async save(): Promise<void> {
    if (!this.dirty) return;
    await mkdir(dirname(this.path), { recursive: true });
    const obj = Object.fromEntries(this.entries.entries());
    await writeFile(this.path, JSON.stringify(obj, null, 2), "utf8");
    this.dirty = false;
  }
}