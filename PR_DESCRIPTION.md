# Real SWE-bench Patch Generation with Claude

## Summary

This PR adds **REAL patch generation** capabilities to the SWE-bench evaluation system. Instead of using empty patches for testing, we now generate actual fixes using Claude and evaluate them through the official SWE-bench infrastructure.

## Key Changes

### 1. New Scripts for Real Patch Generation

- **`scripts/run-swebench-real.ts`** - Full implementation with repository cloning and context gathering
- **`scripts/run-swebench-real-simple.ts`** - Simplified version that successfully generates and evaluates patches

### 2. Fixed Patch Extraction

- **`scripts/utils/claude-patch-generator.ts`** - Improved `extractPatch()` function to prevent Claude's conversation from appearing in patches
- Added better prompt instructions to get clean diff output

### 3. Documentation

Added comprehensive analysis and documentation:
- `docs/logs/20250602/2027-analysis.md` - Post-implementation review
- `docs/logs/20250602/2030-empty-patches-explanation.md` - Explains empty vs real patches
- `docs/logs/20250602/2035-nextsteps.md` - Action plan for real patches
- `docs/logs/20250602/2038-analysis.md` - Complete implementation plan
- `docs/logs/20250602/2100-real-patches-success.md` - Success story

## Results

### ✅ Successfully Resolved: django__django-11099

Generated patch that fixes UsernameValidator trailing newline issue:
```diff
-    regex = r'^[\w.@+-]+$'
+    regex = r'^[\w.@+-]+\Z'
```

**Result**: Tests `test_ascii_validator` and `test_unicode_validator` now PASS!

### Key Findings

1. **The infrastructure works!** - When given real patches instead of empty strings, tests actually pass
2. **Claude can generate working patches** - At least for some SWE-bench problems
3. **Minor bug discovered** - Summary calculation shows 0 resolved even when individual results show success

## Testing

```bash
# Generate real patches and evaluate them
pnpm tsx scripts/run-swebench-real-simple.ts --max-instances 2

# Results: django__django-11099 RESOLVED with real patch!
```

## Next Steps

1. Fix the summary calculation bug
2. Run full 300-instance SWE-bench Lite evaluation with real patches
3. Optimize patch generation for harder problems
4. Publish real benchmark scores

## Related

- Builds on PR #103 (official SWE-bench integration)
- Addresses the issue of 0% success rates by generating actual fixes