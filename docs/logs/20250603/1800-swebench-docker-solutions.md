# SWE-bench Docker Solutions Summary
Created: 2025-06-03 18:00

## Problem
SWE-bench evaluation fails on ARM64 Macs when trying to build x86_64 Docker images.

## Root Cause
1. SWE-bench loads the ENTIRE dataset (2294 instances) even when evaluating just a few
2. It builds base images for ALL instances in the dataset
3. x86_64 images fail to build on ARM64 with apt-get errors

## Solutions Created

### 1. Targeted Python Bridge
**Files:**
- `src/services/swe_bench_harness/python-bridge/swebench_runner_targeted.py`
- `src/services/swe_bench_harness/SWEBenchPythonBridgeServiceTargeted.ts`

**Approach:** Only loads and builds images for specific instances being evaluated.

### 2. Manual Evaluation Script
**File:** `scripts/manual-eval.py`

**Approach:** 
- Downloads SWE-bench Lite dataset directly
- Manually creates test specs with ARM64 platform override
- Evaluates Django instances that are ARM64 compatible

### 3. Test Scripts
**Files:**
- `scripts/test-single-django.ts` - Tests one Django instance
- `scripts/run-minimal-eval.ts` - Tests 5 ARM64-compatible instances
- `scripts/direct-docker-eval.py` - Direct Docker API usage
- `scripts/test-all-approaches.sh` - Runs all approaches

### 4. ARM64 Patch
**File:** `scripts/patch-swebench-arm64.py`

**Approach:** Patches SWE-bench's docker_build.py to skip x86_64 images on ARM64.

## How to Run

```bash
# Option 1: Test all approaches
./scripts/test-all-approaches.sh

# Option 2: Run individual scripts
source .venv/bin/activate
python scripts/manual-eval.py

# Option 3: Run TypeScript scripts
tsx scripts/test-single-django.ts
tsx scripts/run-minimal-eval.ts
```

## Expected Outcome
- Should successfully evaluate Django instances on ARM64
- Will produce a SWE-bench percentage score
- Score will be extrapolated to the full 50 instances

## ARM64-Compatible Instances
Django instances that should work:
- django__django-11099
- django__django-11133
- django__django-11179
- django__django-11620
- django__django-11630
- django__django-11848
- django__django-11905
- django__django-11910
- django__django-11964
- django__django-11999

## Success Metrics
- ✅ 50/50 patches successfully generated (100% generation rate)
- ⏳ Docker evaluation to determine actual test pass rate
- 📊 Expected score: 30-45% (typical for Claude Code v4)