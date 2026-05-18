// Translates legacy BigInt IDs (from the Laravel-shaped source DB) into
// the cuid strings used by the new schema. Persists to disk so re-runs
// of the migration script find existing mappings instead of duplicating
// records.
//
// Also tracks "intentionally skipped" IDs (e.g. demo participants), so
// dependent translators can tell "parent was skipped on purpose" apart
// from "parent translator hasn't run yet / had a bug". The former is a
// silent skip; the latter is a real failure.
//
// One IdMap per (source table → target table) pair. Stored on disk as
// JSON at `prisma/legacy/id-maps/<source>__<target>.json` in the shape:
//   {
//     "mappings": { "12": "cuid_abc", "13": "cuid_def" },
//     "skipped":  ["1", "2", "3"]
//   }
// (Old flat-object format is read for back-compat.)
//
// BigInts are serialised as strings on disk (JSON doesn't have BigInt).

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const MAP_DIR = join(process.cwd(), "prisma", "legacy", "id-maps");

type DiskShape = {
  mappings: Record<string, string>;
  skipped: string[];
};

export class IdMap {
  private readonly path: string;
  private readonly entries: Map<string, string>;
  private readonly skipped: Set<string>;
  private dirty = false;

  private constructor(
    path: string,
    entries: Map<string, string>,
    skipped: Set<string>
  ) {
    this.path = path;
    this.entries = entries;
    this.skipped = skipped;
  }

  static async load(sourceTable: string, targetModel: string): Promise<IdMap> {
    const path = join(MAP_DIR, `${sourceTable}__${targetModel}.json`);
    let entries = new Map<string, string>();
    let skipped = new Set<string>();
    try {
      const text = await readFile(path, "utf8");
      const parsed = JSON.parse(text) as DiskShape | Record<string, string>;
      // New shape has `mappings` key; old flat-object shape doesn't.
      if (parsed && typeof parsed === "object" && "mappings" in parsed) {
        entries = new Map(Object.entries(parsed.mappings));
        skipped = new Set(parsed.skipped ?? []);
      } else {
        entries = new Map(Object.entries(parsed as Record<string, string>));
      }
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
    return new IdMap(path, entries, skipped);
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
    // If a row was previously skipped and is now being mapped, drop it
    // from the skipped set (re-classification).
    if (this.skipped.delete(key)) this.dirty = true;
  }

  // Record that this source row was intentionally not migrated (e.g.
  // demo data, soft-deleted). Dependents seeing "parent missing from
  // mappings AND present in skipped" know it's a silent skip, not a bug.
  markSkipped(legacyId: bigint | number | string): void {
    const key = String(legacyId);
    if (!this.skipped.has(key)) {
      this.skipped.add(key);
      this.dirty = true;
    }
  }

  isSkipped(legacyId: bigint | number | string): boolean {
    return this.skipped.has(String(legacyId));
  }

  size(): number {
    return this.entries.size;
  }

  async save(): Promise<void> {
    if (!this.dirty) return;
    await mkdir(dirname(this.path), { recursive: true });
    const obj: DiskShape = {
      mappings: Object.fromEntries(this.entries.entries()),
      skipped: Array.from(this.skipped).sort(),
    };
    await writeFile(this.path, JSON.stringify(obj, null, 2), "utf8");
    this.dirty = false;
  }
}