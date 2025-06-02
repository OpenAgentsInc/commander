# Scripts Directory

This directory contains various utility scripts for the OpenAgents Commander project.

## Current Scripts (as of 2025-06-02)

### 🚀 SWE-bench Runners (ACTIVE)
- `run-swebench-complete.ts` - **PRIMARY** Full SWE-bench evaluation with Docker
- `run-batch-patch-generation.ts` - Batch patch generation without Docker (for testing)
- `run-full-swebench-evaluation.ts` - Full evaluation with simulated Docker
- `run-swebench-debug.ts` - Debug runner with extensive logging

### 🧪 Test Scripts (ACTIVE)
- `test-patch-generation-simple.ts` - Test patch generation for single task
- `test-claude-direct-sympy.ts` - Test Claude directly on SymPy task
- `test-direct-harness.ts` - Test harness service access
- `test-harness-step-by-step.ts` - Step-by-step harness testing
- `debug-layer-composition.ts` - Debug Effect layer composition
- `debug-service-dependencies.ts` - Debug service dependency issues

### 🐳 Docker Scripts (ACTIVE)
- `docker-evaluation.ts` - Docker-based patch evaluation
- `test-swebench-docker-build.ts` - Test Docker build process
- `demo-docker-build.ts` - Demo Docker build functionality

### 🗄️ Database Scripts (ACTIVE)
- `init-db.js` - Initialize PGLite database
- `query-db.js` - Query database directly
- `query-pglite-db.js` - Query PGLite database
- `pglite-psql.js` - PGLite PSQL interface
- `check-db.js` - Check database status

### 🌉 Claude Bridge Scripts (DEPRECATED)
- `start-claude-bridge.sh` - Start Claude bridge service
- `stop-claude-bridge.sh` - Stop Claude bridge service
- `test-bridge-service.sh` - Test bridge service
- `test-claude-websocket.ts` - Test Claude WebSocket connection

### 📊 Analysis Scripts (ACTIVE)
- `analyze-swebench-results.sh` - Analyze SWE-bench results
- `consolidate-all-results.ts` - Consolidate evaluation results
- `check-swebench-baseline.sh` - Check baseline results

### 🛠️ Utility Scripts (ACTIVE)
- `typecheckFile.js` - Type check individual files
- `copyAllToClipboard.js` - Copy file contents to clipboard
- `fetch_swebench_tasks.sh` - Download SWE-bench tasks

### ⚠️ OLD/DEPRECATED Scripts (TO BE REMOVED)
These scripts use old patterns or duplicate functionality:

#### Old SWE-bench Runners
- `run_swe_bench_batch.ts` - Old batch runner
- `run_swe_bench_batch_env.ts` - Old env-based runner
- `run_swe_bench_batch_env_effect.ts` - Old Effect runner
- `run_swe_bench_batch_fixed.ts` - Old "fixed" runner
- `run_swe_bench_claude_test.ts` - Old Claude test
- `run_swe_bench_cli.ts` - Old CLI runner (still referenced)
- `run_swe_bench_docker.ts` - Old Docker runner
- `run_swe_bench_docker_direct.ts` - Old direct Docker
- `run_swe_bench_real.ts` - Old "real" runner
- `run_swe_bench_standalone.ts` - Old standalone runner
- `run-comprehensive-swebench-batch.ts` - Duplicate batch runner
- `run-full-swebench-batch.ts` - Duplicate full runner
- `run-quick-swebench-sample.ts` - Duplicate sample runner
- `run-swebench-batch-chunked.ts` - Duplicate chunked runner
- `run-swebench-minimal.ts` - Duplicate minimal runner
- `run-swebench-task-simple.ts` - Duplicate simple runner
- `run-swebench-task.ts` - Duplicate task runner

#### Old Test Scripts
- `test-agent-patch-generation.ts` - Old patch gen test
- `test-claude-code-formatting.ts` - Old formatting test
- `test-claude-code-no-model.ts` - Old no-model test
- `test-claude-code-swebench.ts` - Old SWE-bench test
- `test-claude-direct.ts` - Old direct test
- `test-claude-patch-direct.ts` - Old patch test
- `test-claude-pty-standalone.js` - Old PTY test
- `test-docker.js` - Old Docker test
- `test-minimal-layer.ts` - Old layer test
- `test-patch-generation.ts` - Old patch gen test
- `test-swebench-integration.ts` - Old integration test
- `test-swebench-manual-layers.ts` - Old manual layers test
- `test-fixed-layer.ts` - Temporary fix test
- `test-minimal-harness.ts` - Temporary harness test

#### Shell Scripts (TO REVIEW)
- `run-claude-code-batch-workaround.sh` - Workaround script
- `run-claude-code-test.sh` - Test script
- `test-swebench-simple.sh` - Simple test
- `test-django-baseline.sh` - Django baseline test
- `manual-swebench-docker.sh` - Manual Docker test
- `create-mock-swebench-image.sh` - Mock image creator
- `prepare-swebench-base.sh` - Base preparation
- `start-with-bridge.sh` - Bridge starter

#### Other
- `check_python_deps.py` - Python dependency checker (in wrong folder)
- `download_swe_bench_tasks.py` - Task downloader (in wrong folder)
- `demo-swebench-lifecycle.ts` - Old demo
- `check-swebench-ready.ts` - Old readiness check
- `db-debug-endpoints.js` - Debug endpoints
- `monitor-db-writes.js` - DB monitor
- `query-db-ws.js` - WebSocket DB query

## Usage

### To run a full SWE-bench evaluation:
```bash
pnpm tsx scripts/run-swebench-complete.ts
```

### To generate patches only (no Docker):
```bash
pnpm tsx scripts/run-batch-patch-generation.ts
```

### To debug a specific task:
```bash
pnpm tsx scripts/run-swebench-debug.ts <task-id>
```

### To test layer composition:
```bash
pnpm tsx scripts/debug-layer-composition.ts
```

## Cleanup Plan

1. Remove all scripts marked as OLD/DEPRECATED
2. Move Python scripts to appropriate location
3. Consolidate duplicate functionality
4. Update remaining scripts to use consistent patterns
5. Add proper TypeScript types where missing