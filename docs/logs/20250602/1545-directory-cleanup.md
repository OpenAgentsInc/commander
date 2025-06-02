# Directory Structure Cleanup - June 2, 2025

## Directories Cleaned Up

### Deleted:
- `playwright-report/` - Test report artifacts (gitignored)
- `temp_astropy/` - Temporary test directory (gitignored)
- `temp_sympy/` - Temporary test directory (gitignored)
- `test-results/` - Test results directory (gitignored)

### Moved:
- `swebench-results/` → `docs/swebench-results/`
  - Contains all evaluation results with patches and summaries
  - Updated all references in code and documentation

## Code Updates

### Scripts Updated:
- `scripts/run-swebench-evaluation.ts` - Main evaluation runner
- `scripts/monitor-swebench-progress.ts` - Progress monitor
- `scripts/run-swebench-cli.ts` - CLI runner
- `src/main.ts` - IPC handlers for UI

### Documentation Updated:
- `README.md` - Updated results path
- `docs/swebench/running-swebench-tasks.md` - Updated all references
- `docs/swebench/running-evaluations-ui.md` - Updated results path

## New Structure

```
commander/
├── docs/
│   ├── swebench-results/     # All evaluation results
│   │   ├── eval-*/           # Individual evaluation runs
│   │   └── ...
│   ├── logs/                 # Development logs
│   └── ...
└── (clean root directory)
```

All temporary and test directories have been removed or are properly gitignored.