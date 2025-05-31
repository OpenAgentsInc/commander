# Next Steps: End-to-End Testing with Real SWE-Bench Data

## Overview
To test the SWE-Bench harness implementation end-to-end with real data, we need to set up the actual Docker environment, obtain real task data, and progressively test from simple to complex evaluations.

## 1. Get SWE-Bench Docker Image & Data

### Docker Image
- Pull/build the official SWE-bench Docker image that contains:
  - Pre-configured conda environments for Python projects
  - Required system dependencies
  - Testing frameworks
- Alternative: Build from their Dockerfile if customization needed

### Task Data
- Download actual SWE-bench task JSON files from their dataset
- Configure `SWE_BENCH_TASKS_PATH` in ConfigurationService to point to the data directory
- Start with the "SWE-bench Lite" subset (300 tasks) for easier testing

## 2. Create Integration Test Script

```typescript
// scripts/test-swebench-integration.ts
import { Effect, Layer, Runtime } from "effect";
import { NodeFileSystem } from "@effect/platform-node";
import { FullSWEBenchHarnessLayer } from "@/services/swe_bench_harness/example-layer-composition";
import { SWEBenchHarnessService } from "@/services/swe_bench_harness";

const program = Effect.gen(function* () {
  const harness = yield* SWEBenchHarnessService;
  
  // Start with an easy task (e.g., django__django-11099)
  const result = yield* harness.evaluateTask(
    "django__django-11099",
    "--- a/django/core/cache/backends/memcached.py\n+++ b/django/core/cache/backends/memcached.py\n@@ -1,5 +1,5 @@\n-\"Memcached cache backend\"\n+\"Memcached cache backend.\"\n"
  );
  
  console.log("Evaluation Result:", result);
});

// Run with full layer
Effect.runPromise(program.pipe(
  Effect.provide(FullSWEBenchHarnessLayer)
));
```

## 3. Add IPC Endpoint (Optional Phase 4.4)

### Main Process Handler
```typescript
// In main.ts
ipcMain.handle('swebench:evaluate-task', async (event, instanceId: string, patchContent: string) => {
  return Runtime.runPromise(
    sweBenchRuntime,
    Effect.gen(function* () {
      const harness = yield* SWEBenchHarnessService;
      return yield* harness.evaluateTask(instanceId, patchContent);
    })
  );
});
```

### Renderer API
- Expose via context bridge
- Create simple test UI or CLI command
- View results in console/logs initially

## 4. Test with Progressive Complexity

### Stage 1: Trivial Patches
- Documentation fixes
- Typo corrections
- Comment updates
- Verify: Container starts, patch applies, no tests break

### Stage 2: Simple Bug Fixes
- Single-line code changes
- Clear test failures that patch should fix
- Verify: Tests transition from FAIL to PASS

### Stage 3: Complex Tasks
- Multi-file changes
- Multiple test failures
- Dependency interactions
- Verify: All FAIL_TO_PASS tests pass, PASS_TO_PASS remain passing

## 5. Monitor & Debug

### Container Monitoring
```bash
# Watch container logs in real-time
docker logs -f <container-id>

# Check container file system
docker exec <container-id> ls -la /swe_bench_workdir/
```

### Debug Checkpoints
1. **Task Loading**: Verify task JSON parsed correctly
2. **Container Setup**: Check repo cloned at correct commit
3. **Script Generation**: Review generated eval.sh for correctness
4. **Patch Application**: Verify patch applies (or reverses) cleanly
5. **Test Execution**: Monitor pytest/unittest output
6. **Report Collection**: Ensure report.json properly extracted
7. **Resource Cleanup**: Verify container and temp files removed

### Telemetry Events
Enable telemetry to track:
- Task start/completion times
- Container lifecycle events
- Evaluation success/failure rates
- Performance metrics

## 6. Performance Considerations

- **Container Reuse**: Consider keeping containers warm for multiple evaluations
- **Parallel Execution**: Run multiple evaluations concurrently (with resource limits)
- **Caching**: Cache cloned repositories to avoid repeated cloning
- **Timeout Handling**: Set appropriate timeouts for long-running tests

## 7. Error Recovery

Test error scenarios:
- Network failures during clone
- Invalid patches
- Container crashes
- Timeout scenarios
- Disk space issues

## Key Success Metrics

1. **Correctness**: Results match official SWE-bench evaluations
2. **Reliability**: No resource leaks, proper cleanup
3. **Performance**: Reasonable evaluation times
4. **Debuggability**: Clear error messages and logs

The key is starting with the simplest possible task to verify the entire pipeline works before attempting complex evaluations. Once basic flow is proven, gradually increase complexity while monitoring for issues.