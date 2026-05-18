# scripts/restore-prod-to-staging.ps1
#
# Dump the LIVE Supabase production database (public schema only) and
# restore it into the LOCAL staging database used by the legacy-data
# migration script.
#
# SAFETY:
#   - Read-only against prod (pg_dump only).
#   - Restore drops everything in the staging DB's public schema first
#     and recreates from the dump — staging is treated as throwaway.
#   - Refuses to run unless you've set both env vars below.
#
# USAGE (PowerShell):
#   $env:PROD_DATABASE_URL    = "postgresql://postgres:[password]@db.mgihlxyfbvzqyqodvgsc.supabase.co:5432/postgres"
#   $env:STAGING_DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/providr_legacy_staging"
#   .\scripts\restore-prod-to-staging.ps1
#
# After it finishes:
#   1. Add LEGACY_DATABASE_URL=$env:STAGING_DATABASE_URL to .env
#   2. Run: npm run db:generate:legacy
#   3. Run: npm run db:migrate-legacy            (dry-run, no writes)

$ErrorActionPreference = "Stop"

# Resolve Postgres tool paths (assumes PostgreSQL 17 install).
$pgBin = "C:\Program Files\PostgreSQL\17\bin"
$pgDump = Join-Path $pgBin "pg_dump.exe"
$psql = Join-Path $pgBin "psql.exe"

if (-not (Test-Path $pgDump)) {
  throw "pg_dump not found at $pgDump. Update `$pgBin in this script."
}

if (-not $env:PROD_DATABASE_URL) {
  throw "PROD_DATABASE_URL is not set. Paste the Supabase Direct connection URI."
}
if (-not $env:STAGING_DATABASE_URL) {
  throw "STAGING_DATABASE_URL is not set."
}
if ($env:PROD_DATABASE_URL -eq $env:STAGING_DATABASE_URL) {
  throw "PROD_DATABASE_URL and STAGING_DATABASE_URL are identical. Refusing."
}

# Sanity guard: staging should be on localhost, otherwise we might
# overwrite something we shouldn't.
if ($env:STAGING_DATABASE_URL -notmatch "localhost|127\.0\.0\.1") {
  Write-Host "STAGING_DATABASE_URL does not point at localhost. Type 'yes' to continue:" -ForegroundColor Yellow
  $confirm = Read-Host
  if ($confirm -ne "yes") { throw "Aborted." }
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$dumpDir = Join-Path $PSScriptRoot ".." "tmp" "legacy-dumps"
New-Item -ItemType Directory -Path $dumpDir -Force | Out-Null
$dumpFile = Join-Path $dumpDir "prod-public-$timestamp.dump"

Write-Host "`n===== legacy DB dump + restore =====" -ForegroundColor Cyan
Write-Host "dump file: $dumpFile"
Write-Host ""

# ─── Step 1: dump prod public schema ──────────────────────────────────
Write-Host "[1/3] Dumping public schema from prod..." -ForegroundColor Cyan
& $pgDump `
  --schema=public `
  --no-owner `
  --no-acl `
  --format=custom `
  --file=$dumpFile `
  $env:PROD_DATABASE_URL
if ($LASTEXITCODE -ne 0) { throw "pg_dump failed (exit $LASTEXITCODE)" }
$dumpSize = (Get-Item $dumpFile).Length / 1MB
Write-Host ("    done. Dump size: {0:N2} MB" -f $dumpSize) -ForegroundColor Green

# ─── Step 2: wipe staging public schema ───────────────────────────────
Write-Host "`n[2/3] Wiping staging public schema..." -ForegroundColor Cyan
& $psql $env:STAGING_DATABASE_URL -v ON_ERROR_STOP=1 `
  -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"
if ($LASTEXITCODE -ne 0) { throw "Schema wipe failed (exit $LASTEXITCODE)" }
Write-Host "    done." -ForegroundColor Green

# ─── Step 3: restore dump into staging ────────────────────────────────
Write-Host "`n[3/3] Restoring into staging..." -ForegroundColor Cyan
$pgRestore = Join-Path $pgBin "pg_restore.exe"
& $pgRestore `
  --no-owner `
  --no-acl `
  --dbname=$env:STAGING_DATABASE_URL `
  $dumpFile
# pg_restore exits non-zero for benign warnings (extension already
# exists, etc.). We don't treat that as fatal but do show it.
if ($LASTEXITCODE -ne 0) {
  Write-Host "    pg_restore returned $LASTEXITCODE (often benign — read above)" -ForegroundColor Yellow
}

# ─── Verify ───────────────────────────────────────────────────────────
Write-Host "`n===== verification =====" -ForegroundColor Cyan
$tableCount = & $psql $env:STAGING_DATABASE_URL -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" 2>&1
Write-Host "tables in staging.public: $($tableCount.Trim())"

Write-Host "`nDone.`n" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Add to .env:"
Write-Host "       LEGACY_DATABASE_URL=`"$env:STAGING_DATABASE_URL`""
Write-Host "  2. Run: npm run db:generate:legacy"
Write-Host "  3. Run: npm run db:migrate-legacy"
Write-Host ""
Write-Host "Reminder: dump file at $dumpFile contains real customer data." -ForegroundColor Yellow
Write-Host "Delete it after migration verification:"
Write-Host "  Remove-Item `"$dumpFile`""