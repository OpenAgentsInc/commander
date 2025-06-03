# SWE-bench Integration - Real Evaluation System

## Quick Start

```bash
# Generate REAL patches with Claude and run full evaluation
pnpm tsx scripts/run-swebench-real-simple.ts --max-instances 5

# Run quick test with 2 instances
pnpm tsx scripts/run-swebench-quick-test.ts

# Run full SWE-bench Lite (300 instances) - takes hours!
pnpm tsx scripts/run-full-swebench-lite.ts

# Monitor evaluation progress in real-time
pnpm tsx scripts/monitor-swebench-progress.ts

# View results
cat swebench-results/real-*/summary.json | jq '.'
```

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture) 
3. [Implementation Details](#implementation-details)
4. [Running Evaluations](#running-evaluations)
5. [Understanding Results](#understanding-results)
6. [Patch Generation](#patch-generation)
7. [Known Issues](#known-issues)
8. [Development Guide](#development-guide)

## Overview

### What is SWE-bench?

SWE-bench (Software Engineering Benchmark) evaluates AI systems on real-world software engineering tasks. It contains 2,298 GitHub issues from popular Python repositories where AI must:

1. Read a problem statement (GitHub issue)
2. Generate a patch that fixes the issue
3. Pass the actual test suite to verify the fix

### Our Implementation

**⚡ REAL SWE-bench Integration**: We integrate the official SWE-bench repository as a git submodule and use a Python bridge to run actual evaluations with Docker containers and real test execution.

Key features:
- **Official SWE-bench Integration**: Uses the real SWE-bench Python code via JSON-lines bridge
- **Real Patch Generation**: Claude generates actual fixes for issues
- **Docker-based Evaluation**: Runs tests in isolated containers per the official methodology
- **Verified Results**: django__django-11099 RESOLVED with our generated patch!
- **Full Dataset Support**: Can run on all 2,298 tasks or SWE-bench Lite (300 tasks)

## Architecture

### System Design

```
┌─────────────────────────────────────────────────────────────────┐
│                     TypeScript/Electron Layer                     │
│                                                                   │
│  ┌───────────────────┐    ┌─────────────────────────────────┐  │
│  │   CLI Scripts     │    │  SWEBenchPythonBridgeService   │  │
│  │ - run-swebench-*  │───▶│  - JSON-lines communication   │  │
│  │ - Patch generator │    │  - Subprocess management       │  │
│  └───────────────────┘    └──────────────┬──────────────────┘  │
└───────────────────────────────────────────┼──────────────────────┘
                                            │ JSON-lines protocol
┌───────────────────────────────────────────▼──────────────────────┐
│                      Python Bridge Layer                          │
│                 scripts/python_bridge.py                          │
│  - Receives commands via stdin (JSON-lines)                      │
│  - Calls official SWE-bench functions                           │
│  - Returns results via stdout (JSON-lines)                      │
└───────────────────────────────────────────────────────────────────┘
                                            │
┌──────────────────────────────────────────▼───────────────────────┐
│              Official SWE-bench (Git Submodule)                   │
│                       /swebench/                                   │
│  - run_evaluation.py: Main evaluation entry point                │
│  - docker_build.py: Container image builder                      │
│  - grading.py: Test result evaluation                           │
│  - Runs actual tests in Docker containers                       │
└──────────────────────────────────────────────────────────────────┘
```

### Key Components

1. **TypeScript Layer** (Commander)
   - `SWEBenchPythonBridgeService`: Effect service managing Python subprocess
   - `claude-patch-generator.ts`: Generates patches using Claude API
   - Various CLI scripts for different evaluation scenarios

2. **Python Bridge** (`scripts/python_bridge.py`)
   - Handles JSON-lines communication protocol
   - Translates between TypeScript and Python SWE-bench API
   - Manages evaluation lifecycle

3. **Official SWE-bench** (git submodule at `/swebench/`)
   - Complete official implementation
   - Docker-based test execution
   - Real repository cloning and patching

## Implementation Details

### Python Bridge Protocol

The bridge uses JSON-lines for bidirectional communication:

```typescript
// TypeScript sends:
{ "command": "run_evaluation", "predictions": [...], "options": {...} }

// Python responds with streaming messages:
{ "type": "status", "data": { "message": "Building images..." } }
{ "type": "progress", "data": { "percentage": 50, "completed": 1 } }
{ "type": "complete", "data": { "results": {...}, "summary": {...} } }
```

### Evaluation Flow

1. **Initialize Bridge**: Start Python subprocess with virtual environment
2. **Generate Patches**: Use Claude to create fixes for issues
3. **Send Predictions**: Pass patches to Python bridge
4. **Docker Execution**: 
   - Build environment images for each repository version
   - Apply patches to code
   - Run test suites
   - Collect results
5. **Process Results**: Aggregate success/failure data

### Docker Integration

SWE-bench uses Docker for reproducible test environments:
- Each task runs in an isolated container
- Exact repository version is checked out
- Dependencies match the original environment
- Tests run with same configuration as CI

## Running Evaluations

### Prerequisites

```bash
# Install Python dependencies
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r scripts/requirements-swebench.txt

# Ensure Docker is running
docker --version

# Authenticate Claude (for patch generation)
claude auth
```

### Basic Usage

```bash
# Quick test with 2 instances
pnpm tsx scripts/run-swebench-quick-test.ts

# Run with specific number of instances
pnpm tsx scripts/run-swebench-real-simple.ts --max-instances 10

# Run on specific tasks
pnpm tsx scripts/run-swebench-real-simple.ts --instance-ids "django__django-11099,sympy__sympy-12419"
```

### Advanced Scripts

1. **`run-swebench-real-simple.ts`**: Simplified runner that generates real patches
   - Best for testing and development
   - Clear progress output
   - Saves patches and results

2. **`run-swebench-evaluation.ts`**: Original integration script
   - Supports different patch sources
   - Configurable via environment variables

3. **`run-full-swebench-lite.ts`**: Full 300-instance evaluation
   - Production benchmark run
   - Progress logging to file
   - Resume capability

4. **`run-swebench-quick-test.ts`**: Minimal test for verification
   - Tests 2 instances quickly
   - Good for checking setup

## Understanding Results

### Output Structure

```
swebench-results/
├── real-<timestamp>/
│   ├── django__django-11099.patch     # Generated patch
│   ├── summary.json                   # Overall results  
│   └── detailed-results.json          # Per-instance details
```

### Success Example

From our actual run:
```json
{
  "django__django-11099": {
    "resolved": true,
    "tests_passed": [
      "test_ascii_validator",
      "test_unicode_validator"
    ]
  }
}
```

### Generated Patch That Works

```diff
diff --git a/django/contrib/auth/validators.py b/django/contrib/auth/validators.py
--- a/django/contrib/auth/validators.py
+++ b/django/contrib/auth/validators.py
@@ -7,7 +7,7 @@ from django.utils.translation import gettext_lazy as _
 
 @deconstructible
 class ASCIIUsernameValidator(validators.RegexValidator):
-    regex = r'^[\w.@+-]+$'
+    regex = r'^[\w.@+-]+\Z'
     message = _(
         'Enter a valid username. This value may contain only English letters, '
         'numbers, and @/./+/-/_ characters.'
```

This simple change from `$` to `\Z` prevents usernames with trailing newlines!

## Patch Generation

### Claude Integration

The system uses Claude via the CLI to generate patches:

```typescript
// From claude-patch-generator.ts
export async function generatePatchWithClaude(
  task: SWEBenchTask,
  options: PatchGenerationOptions
): Promise<PatchGenerationResult> {
  // Builds comprehensive prompt with problem statement
  // Executes Claude CLI with streaming support
  // Extracts clean patch from response
}
```

### Prompt Engineering

Key elements for successful patch generation:
1. Clear problem statement
2. Repository context
3. Test information (FAIL_TO_PASS tests)
4. Explicit instructions for diff format
5. Request for minimal changes

### Patch Extraction

The `extractPatch` function carefully isolates the diff from Claude's response:
- Looks for code blocks with diffs
- Strips conversation/explanations
- Validates unified diff format
- Handles various response formats

## Known Issues

### 1. Summary Calculation Bug
Individual results show `"resolved": true` but summary shows 0 resolved. This is a calculation issue in the Python bridge that needs fixing.

### 2. Harder Problems
Some tasks like sympy__sympy-12419 require deeper understanding and multiple attempts. Current simple prompting may not be sufficient.

### 3. Docker Image Building
First run takes longer as Docker images are built for each unique repository version. These are cached for subsequent runs.

## Development Guide

### Adding New Features

1. **New Evaluation Scripts**: Follow the pattern in `scripts/run-swebench-*.ts`
2. **Patch Generation Improvements**: Modify `claude-patch-generator.ts`
3. **Python Bridge Extensions**: Update both `python_bridge.py` and TypeScript service

### Debugging

```bash
# Enable debug output
export DEBUG=true
pnpm tsx scripts/run-swebench-real-simple.ts --max-instances 1

# Check Python bridge directly
cd scripts && python python_bridge.py

# View Docker containers
docker ps -a | grep swebench

# Inspect generated patches
cat swebench-results/real-*/django__django-11099.patch
```

### Testing

```bash
# Type checking
pnpm run t

# Run integration test
pnpm tsx scripts/test-swebench-integration.ts

# Test patch generation only
pnpm tsx scripts/test-patch-generation-simple.ts
```

## Performance Considerations

- **Docker Images**: First-time builds are slow (~5-10 min per unique repo version)
- **Parallel Execution**: Use `MAX_WORKERS` environment variable (default: 1)
- **Memory Usage**: Each Docker container needs ~2GB RAM
- **Claude Rate Limits**: Sequential patch generation to avoid limits

## Future Improvements

1. **Fix Summary Bug**: Correct the resolved count calculation
2. **Multi-attempt Patching**: Retry with test failure feedback
3. **Parallel Patch Generation**: Speed up Claude API calls
4. **Result Analysis UI**: Better visualization of results
5. **Checkpoint/Resume**: For long-running evaluations
6. **Local Model Support**: Use Ollama for patch generation

## References

- [SWE-bench Paper](https://arxiv.org/abs/2310.06770)
- [Official SWE-bench Repository](https://github.com/princeton-nlp/SWE-bench)
- [Our PR #103](https://github.com/OpenAgentsInc/commander/pull/103) - Initial Python bridge
- [Our PR #104](https://github.com/OpenAgentsInc/commander/pull/104) - Real patch generation

---

**Current Status**: ✅ WORKING - We can generate real patches that pass real tests!

For questions or contributions, please see the main Commander repository.