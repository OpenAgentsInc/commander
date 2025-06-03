# SWE-bench Evaluation Memory Explosion Incident

## Date: 2025-06-02 18:30 UTC

## Summary
During a SWE-bench evaluation run with 10 instances, the system experienced a catastrophic memory leak that caused the terminal process to consume 50GB of memory, severely impacting system performance.

## Timeline

### 18:01 - Initial Run Started
- Executed `pnpm tsx scripts/run-swebench-quick-test.ts`
- Configuration:
  - 10 instances from SWE-bench Lite
  - 2 parallel workers
  - 600s timeout per instance
  - Python bridge initialized successfully

### 18:01-18:10 - Normal Progress
- Evaluation progressed normally from 0% to 80%
- 8 out of 10 instances processed
- Docker containers being created and destroyed as expected
- Memory usage appeared normal initially

### 18:10+ - Memory Explosion
- Process hung at 80% completion (8/10 instances)
- Terminal memory usage exploded to **50GB**
- System became unresponsive
- Command timeout after 10 minutes

### 18:11 - Process Investigation
- `ps aux` revealed multiple Docker Scout processes running:
  ```
  docker-scout scout sbom sha256:ebf13d4c91f5f82b769bc870e6b4e4c964426e75c878fe54df11c640fc105eaf
  docker-scout scout sbom sha256:ef910b04378a1fe14f8a3b1bad4e8e1b8444513f1ffca59e2771393e24001eda
  ```
- Docker Desktop processes consuming significant resources
- Python SWE-bench process appeared to have terminated

## Root Cause Analysis

### 1. **Docker Scout SBOM Generation**
The Docker Scout processes were generating Software Bill of Materials (SBOM) for container images. This process appears to have gone into an infinite loop or memory leak condition.

### 2. **Parallel Execution Issues**
With `max_workers: 2`, multiple Docker containers were being built and analyzed simultaneously, potentially causing:
- Race conditions in Docker Scout
- Accumulated memory from parallel SBOM generation
- Unbounded log accumulation

### 3. **Stream Processing Memory Leak**
The Effect Stream processing in our TypeScript code may have been accumulating all messages in memory without proper cleanup:
```typescript
Stream.runCollect,  // This collects ALL messages in memory
Effect.map(Chunk.toArray)
```

### 4. **Python Bridge Output Buffering**
The Python subprocess was likely generating massive amounts of log output that was being buffered in memory by the Node.js process.

## Impact

1. **System Performance**: Complete system freeze requiring manual intervention
2. **Evaluation Failure**: Only 8/10 instances completed
3. **Resource Waste**: 50GB memory consumption for a simple test
4. **Data Loss**: Final 2 instances results not captured

## Immediate Fixes Needed

### 1. **Disable Docker Scout**
```bash
export DOCKER_SCOUT_SUGGEST=false
docker scout config organization --disable
```

### 2. **Stream Processing Optimization**
Replace `Stream.runCollect` with `Stream.runDrain` to avoid memory accumulation:
```typescript
yield* stream.pipe(
  Stream.tap(processMessage),
  Stream.runDrain  // Don't collect, just process
);
```

### 3. **Resource Limits**
- Set `max_workers: 1` for testing
- Add memory limits to Docker containers
- Implement process memory monitoring

### 4. **Log Rotation**
- Implement log file rotation
- Limit console output buffering
- Add `--max-old-space-size` to Node.js

## Lessons Learned

1. **Docker Scout can cause severe memory issues** when analyzing multiple containers
2. **Parallel Docker operations** need careful resource management
3. **Stream processing** must be designed to handle unbounded data
4. **Python subprocess output** needs proper buffering limits
5. **Always test with small datasets** before scaling up

## Recommendations

1. **Before running full SWE-bench evaluation**:
   - Disable Docker Scout
   - Use single worker mode
   - Implement proper stream processing
   - Add memory monitoring
   - Test with 1-2 instances first

2. **System requirements** for full run:
   - Minimum 32GB RAM
   - 100GB free disk space
   - Docker resource limits configured
   - Log rotation enabled

## Next Steps

1. Fix memory leak issues
2. Re-test with single instance
3. Gradually increase to 5, then 10 instances
4. Only attempt full 300-instance run after stability confirmed

---

**Status**: Critical issue requiring immediate attention before any further SWE-bench evaluations.