# SWE-Bench Scripts

This directory contains scripts for running SWE-Bench evaluations. Due to telemetry service initialization issues in the main application runtime, some scripts may not work correctly in CLI mode.

## Working Scripts

### `run_swe_bench_standalone.ts` ✅ (RECOMMENDED)
A completely standalone implementation that avoids all runtime initialization issues.

```bash
npx tsx scripts/run_swe_bench_standalone.ts \
  --tasks_dir assets/swe_bench_data \
  --instance_ids "task1,task2" \
  --patch_source gold
```

### `download_swe_bench_tasks.py` ✅
Downloads SWE-Bench tasks from Hugging Face.

```bash
python3 scripts/download_swe_bench_tasks.py \
  --dataset_name princeton-nlp/SWE-bench \
  --output_dir assets/swe_bench_data \
  --max_tasks 10
```

## Deprecated Scripts (Telemetry Service Issues)

The following scripts have issues with the TelemetryService when run in CLI mode because they import the full application runtime which is designed for Electron:

- `run_swe_bench_batch.ts` ❌ - Uses FullSWEBenchHarnessLayer
- `run_swe_bench_batch_env.ts` ❌ - Still imports problematic runtime
- `run_swe_bench_batch_env_effect.ts` ❌ - Effect-based version with same issues
- `run_swe_bench_batch_fixed.ts` ❌ - Attempted fix but still has issues
- `run-swebench-minimal.ts` ❌ - Imports harness services
- `run-swebench-task.ts` ❌ - Single task runner with same issues
- `test-swebench-integration.ts` ❌ - Integration tests with runtime deps

## Shell Scripts (Still Working)

- `analyze-swebench-results.sh` ✅
- `check-swebench-baseline.sh` ✅
- `create-mock-swebench-image.sh` ✅
- `fetch_swebench_tasks.sh` ✅
- `manual-swebench-docker.sh` ✅
- `prepare-swebench-base.sh` ✅

## Known Issue

The telemetry service error occurs because:
1. The scripts import services from `src/services/`
2. These services import the runtime module
3. The runtime module initializes browser-specific services at import time
4. Environment variables cannot be set early enough to prevent this

## Solution

Use `run_swe_bench_standalone.ts` for all CLI-based SWE-Bench evaluations. This script:
- Avoids importing any application services
- Runs evaluations in isolated Node.js processes
- Has no dependencies on the Electron runtime
- Works reliably in CLI environments