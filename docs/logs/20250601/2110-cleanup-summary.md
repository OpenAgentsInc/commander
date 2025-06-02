# SWE-Bench Scripts Cleanup Summary

## Date: 2025-06-01 21:10 PST

### Issues Fixed

1. **Telemetry Service Error**: Fixed the "Service not found: TelemetryService" error that was occurring in SWE-bench batch scripts.

2. **Root Directory Cleanup**: Consolidated all test results and temporary files.

### Changes Made

#### 1. Created Standalone Script
- Created `scripts/run_swe_bench_standalone.ts` - A completely standalone SWE-bench runner that avoids all runtime initialization issues
- This script works by:
  - Not importing any application services
  - Running evaluations in isolated Node.js processes
  - Having no dependencies on the Electron runtime

#### 2. Consolidated Test Results
- Moved all test result directories to `swebench-results/old/`:
  - `run-*` directories
  - `test*` directories (test1, test-fixed, test1-env)
  - `*.log` files
- Updated `.gitignore` to exclude:
  - `swebench-results/`
  - `test-*/`
  - `run-*/`
  - `*.log`

#### 3. Organized Temporary Files
- Moved Python test files to `temp_astropy/tests/`
- Moved patch and debug files to `temp_astropy/`
- Moved sympy directory contents to `temp_sympy/`

#### 4. Documented Issues
- Created `scripts/README-swebench.md` documenting:
  - Which scripts work ✅
  - Which scripts are deprecated ❌
  - Root cause of the telemetry service issue
  - Recommended solution (use standalone script)

#### 5. Added Deprecation Notices
- Added deprecation warnings to:
  - `run_swe_bench_batch.ts`
  - `run_swe_bench_batch_env.ts`

### Root Cause Analysis

The telemetry service error occurs because:
1. Scripts import services from `src/services/`
2. These services import the runtime module
3. The runtime module initializes browser-specific services at import time
4. Environment variables cannot be set early enough to prevent this initialization

### Recommended Usage

For all CLI-based SWE-bench evaluations, use:

```bash
npx tsx scripts/run_swe_bench_standalone.ts \
  --tasks_dir assets/swe_bench_data \
  --instance_ids "task1,task2" \
  --patch_source gold
```

This script is guaranteed to work without any runtime initialization issues.