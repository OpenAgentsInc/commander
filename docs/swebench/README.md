# SWE-bench Evaluation System - Comprehensive Guide

## Quick Start

```bash
# Run evaluation with AI-generated patches (Claude)
pnpm tsx scripts/run-swebench-evaluation.ts --patch_source agent:claude_code --max_tasks 10

# Monitor progress in another terminal
pnpm tsx scripts/monitor-swebench-progress.ts

# View results
cat docs/swebench-results/eval-*/summary.json | jq '.statistics'
```

## Table of Contents
1. [Introduction](#introduction)
2. [System Architecture](#system-architecture)
3. [Dataset and Task Structure](#dataset-and-task-structure)
4. [Implementation Details](#implementation-details)
5. [Running Evaluations](#running-evaluations)
6. [Understanding Results](#understanding-results)
7. [Technical Challenges and Solutions](#technical-challenges-and-solutions)
8. [Development Guide](#development-guide)

## Introduction

### What is SWE-bench?

SWE-bench (Software Engineering Benchmark) is a comprehensive benchmark designed to evaluate AI systems on real-world software engineering tasks. It consists of 2,298 tasks extracted from popular Python repositories where AI agents must:

1. Read a problem statement describing a bug or feature request
2. Generate a patch that fixes the issue
3. Pass specific tests that verify the fix

### Our Implementation

The Commander SWE-bench evaluation system provides:
- **Full dataset support**: All 2,298 tasks from the official SWE-bench dataset
- **Multiple patch sources**: Gold patches (reference), empty patches (baseline), or AI-generated patches
- **Real-time monitoring**: Track evaluation progress with live updates
- **Comprehensive metrics**: Success rates, timing data, and detailed results
- **Multiple interfaces**: CLI tools and graphical UI (via Ctrl+7)

## System Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                        User Interface                         │
│  ┌─────────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │   CLI Scripts   │  │   Electron   │  │    Monitor    │  │
│  │ (run-swebench-) │  │   UI (IPC)   │  │  (progress)   │  │
│  └────────┬────────┘  └──────┬───────┘  └───────┬───────┘  │
└───────────┼──────────────────┼──────────────────┼───────────┘
            │                  │                  │
┌───────────▼──────────────────▼──────────────────▼───────────┐
│                      Effect Service Layer                     │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              SWEBenchTaskService                         │ │
│  │  - Load tasks from JSON files                           │ │
│  │  - Parse and validate task data                         │ │
│  │  - Handle JSON-serialized array fields                  │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │           AgentPatchGeneratorService                     │ │
│  │  - Generate patches using AI providers                   │ │
│  │  - Extract patches from AI responses                     │ │
│  │  - Format patches in unified diff format                │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │               AI Provider Layer                          │ │
│  │  - Claude Code (via CLI)                                │ │
│  │  - Ollama (local models)                                │ │
│  │  - OpenAI (future)                                      │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
            │
┌───────────▼──────────────────────────────────────────────────┐
│                      Data Storage Layer                       │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │          assets/swe_bench_data/ (2,298 tasks)           │ │
│  │  - JSON files with task definitions                     │ │
│  │  - Problem statements, test patches, gold patches       │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │        docs/swebench-results/ (evaluation output)       │ │
│  │  - Individual patch files                               │ │
│  │  - progress.json (real-time tracking)                   │ │
│  │  - summary.json (final statistics)                      │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Effect**: Functional programming framework for TypeScript
  - Provides service layers, dependency injection, and error handling
  - All services use Effect patterns for composability
- **TypeScript**: Type-safe implementation
- **Node.js**: Runtime environment
- **Electron**: Desktop application framework (for UI)
- **Claude CLI**: AI provider integration

## Dataset and Task Structure

### Task File Format

Each task is stored as a JSON file in `assets/swe_bench_data/` with this structure:

```json
{
  "instance_id": "django__django-11099",
  "repo": "django/django",
  "base_commit": "d26b2424437dabeeca94d7900b37d2df4410da0c",
  "problem_statement": "Description of the bug or feature request...",
  "hints_text": "Optional hints about the solution",
  "test_patch": "Diff containing test cases that verify the fix",
  "version": "3.0",
  "FAIL_TO_PASS": ["tests/that/should/pass/after/fix.py::test_name"],
  "PASS_TO_PASS": ["tests/that/should/still/pass.py::test_name"],
  "patch": "Optional gold patch (the reference solution)"
}
```

### Important Schema Details

The `FAIL_TO_PASS` and `PASS_TO_PASS` fields are stored as JSON-serialized strings in the dataset files. Our implementation automatically parses these during task loading:

```typescript
// From SWEBenchTaskServiceImpl.ts
const processedTaskData = {
  ...taskData,
  FAIL_TO_PASS: typeof taskData.FAIL_TO_PASS === 'string' 
    ? JSON.parse(taskData.FAIL_TO_PASS) 
    : taskData.FAIL_TO_PASS,
  PASS_TO_PASS: typeof taskData.PASS_TO_PASS === 'string' 
    ? JSON.parse(taskData.PASS_TO_PASS) 
    : taskData.PASS_TO_PASS
};
```

## Implementation Details

### Service Layer Architecture

The system uses Effect's service pattern for clean dependency injection:

```typescript
// Main services
- SWEBenchTaskService: Task loading and management
- AgentPatchGeneratorService: AI patch generation
- ConfigurationService: System configuration
- TelemetryService: Logging and metrics
- ClaudeCliExecutorService: Claude CLI integration
```

### Patch Generation Flow

1. **Task Loading**: Load task from JSON file
2. **Prompt Construction**: Build detailed prompt with problem statement
3. **AI Generation**: Send to AI provider (Claude/Ollama)
4. **Patch Extraction**: Extract unified diff from AI response
5. **Validation**: Basic format validation
6. **Storage**: Save patch to output directory

### AI Prompt Template

The system uses a carefully crafted prompt for patch generation:

```typescript
const prompt = `You are an expert software engineer. Your task is to fix the following issue.

Repository: ${task.repo}
Base commit: ${task.base_commit}

Problem Statement:
${task.problem_statement}

${task.hints_text ? `Hints:\n${task.hints_text}\n` : ''}

Instructions:
1. Analyze the problem carefully
2. Generate a minimal patch that fixes the issue
3. The patch should be in unified diff format
4. Only include necessary changes
5. Ensure the patch will make the failing tests pass

Generate the patch:`;
```

## Running Evaluations

### CLI Usage

```bash
# Basic evaluation with gold patches
pnpm tsx scripts/run-swebench-evaluation.ts --patch_source gold

# AI evaluation with Claude
pnpm tsx scripts/run-swebench-evaluation.ts --patch_source agent:claude_code --max_tasks 50

# Specific tasks
pnpm tsx scripts/run-swebench-evaluation.ts --instance_ids "django__django-11099,sympy__sympy-12419"

# Monitor progress
pnpm tsx scripts/monitor-swebench-progress.ts
```

### Command Line Options

- `--patch_source <type>`: Source of patches
  - `gold`: Use reference patches from dataset
  - `empty`: Use empty patches (baseline)
  - `agent:<provider>`: Use AI provider (e.g., `agent:claude_code`)
- `--max_tasks <N>`: Limit number of tasks to run
- `--instance_ids <ids>`: Comma-separated list of specific task IDs
- `--output_dir <path>`: Custom output directory
- `--tasks_dir <path>`: Custom task directory (default: `assets/swe_bench_data`)
- `--stop_on_failure`: Stop on first failure

### UI Usage

1. Start Commander: `pnpm start`
2. Press **Ctrl+7** (Cmd+7 on Mac) to open Task Browser
3. Select tasks or use "Select All"
4. Click "Launch Evaluation"
5. Choose patch source and options
6. Monitor progress in real-time

## Understanding Results

### Output Structure

```
docs/swebench-results/eval-<timestamp>/
├── summary.json          # Overall statistics
├── progress.json         # Real-time progress data
├── <task_id>.patch      # Generated patch for each task
└── ...
```

### Summary.json Format

```json
{
  "timestamp": "2025-06-02T17:47:51.813Z",
  "configuration": {
    "patchSource": "agent:claude_code",
    "tasksDir": "assets/swe_bench_data",
    "outputDir": "./docs/swebench-results/eval-..."
  },
  "statistics": {
    "totalTasks": 100,
    "successfulTasks": 85,
    "failedTasks": 15,
    "successRate": "85.0%",
    "patchesGenerated": 85,
    "patchGenerationRate": "85.0%",
    "totalDurationMs": 450000,
    "avgDurationSeconds": "4.5"
  },
  "taskResults": [
    {
      "instanceId": "django__django-11099",
      "repo": "django/django",
      "success": true,
      "patchGenerated": true,
      "patchLength": 1234,
      "duration": 4521
    }
  ]
}
```

### Success Metrics

- **Patch Generation Success**: Whether AI generated a valid patch
- **Format Validation**: Whether patch is valid unified diff
- **Future**: Docker-based test execution to verify fixes

## Technical Challenges and Solutions

### 1. Schema Validation Issues

**Problem**: Dataset files have JSON-serialized array fields
**Solution**: Pre-process data before schema validation

### 2. Claude CLI Authentication

**Problem**: `--dangerously-skip-permissions` flag requires interactive acceptance
**Solution**: Removed flag, require proper authentication via `claude auth`

### 3. Effect Layer Composition

**Problem**: Complex dependency graphs in standalone scripts
**Solution**: Created dedicated CLI layers with proper composition

### 4. Memory Management

**Problem**: Loading 2,298 tasks can be memory intensive
**Solution**: Lazy loading with caching, process tasks sequentially

### 5. AI Rate Limiting

**Problem**: Claude API has rate limits
**Solution**: Sequential processing, configurable delays

## Development Guide

### Adding a New AI Provider

1. Create provider implementation in `src/services/ai/providers/`
2. Implement the AI provider interface
3. Add to provider configuration
4. Update `AgentPatchGeneratorService` to support new provider

### Extending Task Processing

1. Modify `SWEBenchTaskService` for new task formats
2. Update schema in `types.ts`
3. Add validation logic

### Debugging Tips

1. **Enable verbose logging**: Set log level to DEBUG
2. **Check patch files**: Inspect generated patches in output directory
3. **Monitor Claude CLI**: Check `~/claude-bridge-service.log`
4. **Use single task**: Test with specific task IDs first

### Testing

```bash
# Run unit tests
pnpm test

# Type checking
pnpm run t

# Test single task
pnpm tsx scripts/run-swebench-evaluation.ts --instance_ids "django__django-11099" --patch_source gold
```

## Best Practices

1. **Start Small**: Test with 5-10 tasks before full runs
2. **Monitor Resources**: Full evaluation uses significant CPU/memory
3. **Backup Results**: Important evaluations should be backed up
4. **Check AI Credits**: Claude API usage can be expensive
5. **Validate Patches**: Spot-check generated patches for quality

## Current Limitations

### What Works
- ✅ Full dataset loading (2,298 tasks)
- ✅ Patch generation with multiple AI providers
- ✅ Progress tracking and monitoring
- ✅ Result aggregation and statistics
- ✅ UI and CLI interfaces

### What's Not Yet Implemented
- ❌ Docker-based test execution
- ❌ Actual verification of patches against tests
- ❌ True pass/fail determination

Currently, the system generates patches and saves them, but doesn't execute the tests to verify if they actually fix the issues. The "success" metric currently only indicates whether a patch was successfully generated, not whether it passes the tests.

## Future Enhancements

1. **Docker Integration**: Full test execution in isolated containers
2. **Test Verification**: Run FAIL_TO_PASS and PASS_TO_PASS tests
3. **Parallel Processing**: Run multiple evaluations concurrently
4. **Result Analysis**: Detailed comparison tools for patches
5. **More AI Providers**: GPT-4, Gemini, local models
6. **Performance Metrics**: Detailed timing and resource usage
7. **Incremental Evaluation**: Resume interrupted runs

## Troubleshooting

### Common Issues

1. **"Schema validation failed"**
   - Ensure you're using the latest code with JSON parsing fix

2. **"Claude CLI exited with code 1"**
   - Run `claude auth` to authenticate
   - Check Claude CLI is installed: `npm install -g @anthropic-ai/cli`

3. **"No tasks found"**
   - Verify `assets/swe_bench_data/` contains JSON files
   - Check file permissions

4. **Out of Memory**
   - Reduce `--max_tasks` value
   - Increase Node.js memory: `NODE_OPTIONS="--max-old-space-size=8192"`

## References

- [SWE-bench Paper](https://arxiv.org/abs/2310.06770)
- [Official Repository](https://github.com/princeton-nlp/SWE-bench)
- [Dataset on Hugging Face](https://huggingface.co/datasets/princeton-nlp/SWE-bench)
- [Effect Documentation](https://effect.website/)
- [Claude CLI Documentation](https://docs.anthropic.com/claude/docs/claude-cli)

---

For questions or contributions, please refer to the main Commander repository.