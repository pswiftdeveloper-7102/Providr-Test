// Lightweight structured logger for the migration script. Goals:
// - One line per row decision (created / skipped / mapped-existing / failed)
// - Per-translator counters that aggregate into a final summary
// - Errors collected, not thrown — the run continues so we see ALL problems
//
// Output goes to stdout (human-readable). For machine-parseable runs,
// pipe through a JSON-line wrapper later.

export type RunMode = "dry-run" | "commit";

export class TranslatorLog {
  readonly name: string;
  created = 0;
  skipped = 0;
  remapped = 0; // found existing target row via dedupe field, recorded mapping
  failed = 0;
  warnings: string[] = [];
  errors: { sourceId: string; reason: string }[] = [];

  constructor(name: string) {
    this.name = name;
  }

  record(kind: "created" | "skipped" | "remapped"): void {
    this[kind]++;
  }

  warn(message: string): void {
    this.warnings.push(message);
  }

  fail(sourceId: string | number | bigint, reason: string): void {
    this.failed++;
    this.errors.push({ sourceId: String(sourceId), reason });
  }

  summary(): string {
    const parts = [
      `created=${this.created}`,
      `remapped=${this.remapped}`,
      `skipped=${this.skipped}`,
      `failed=${this.failed}`,
    ];
    return `[${this.name}] ${parts.join("  ")}`;
  }
}

export class RunLog {
  readonly mode: RunMode;
  readonly startedAt = Date.now();
  readonly translators: TranslatorLog[] = [];

  constructor(mode: RunMode) {
    this.mode = mode;
  }

  translator(name: string): TranslatorLog {
    const t = new TranslatorLog(name);
    this.translators.push(t);
    return t;
  }

  print(): void {
    const totalCreated = this.translators.reduce((n, t) => n + t.created, 0);
    const totalRemapped = this.translators.reduce((n, t) => n + t.remapped, 0);
    const totalFailed = this.translators.reduce((n, t) => n + t.failed, 0);
    const elapsedMs = Date.now() - this.startedAt;

    console.log("");
    console.log("───── migration summary ─────");
    console.log(`mode:      ${this.mode}`);
    console.log(`elapsed:   ${(elapsedMs / 1000).toFixed(1)}s`);
    console.log(`created:   ${totalCreated}`);
    console.log(`remapped:  ${totalRemapped}`);
    console.log(`failed:    ${totalFailed}`);
    console.log("");
    for (const t of this.translators) {
      console.log(t.summary());
      if (t.warnings.length > 0) {
        for (const w of t.warnings.slice(0, 5)) {
          console.log(`  warn:  ${w}`);
        }
        if (t.warnings.length > 5) {
          console.log(`  warn:  …and ${t.warnings.length - 5} more`);
        }
      }
      if (t.errors.length > 0) {
        for (const e of t.errors.slice(0, 5)) {
          console.log(`  error: source=${e.sourceId} ${e.reason}`);
        }
        if (t.errors.length > 5) {
          console.log(`  error: …and ${t.errors.length - 5} more`);
        }
      }
    }
    console.log("");
    if (this.mode === "dry-run") {
      console.log("DRY-RUN — no rows were written. Pass --commit to persist.");
    }
  }
}