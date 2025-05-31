# SWE-Bench Next Steps and Integration Guide

**Date**: 2025-05-31  
**Time**: 17:35  
**Task**: Document next steps for SWE-bench integration and coding agent evaluation

## Overview

The SWE-bench evaluation infrastructure is now functional. This document outlines how to use it, what to test next, and what's needed for full integration with the coding agent.

## Current Status

### What's Working
- ✅ Enhanced Docker environment setup with repository-specific dependencies
- ✅ Container lifecycle management
- ✅ Patch application (both solution and test patches)
- ✅ Test execution with proper pytest commands
- ✅ Report generation and retrieval
- ✅ Results persistence and summarization

### What Was Fixed
- pytest-xvs installation error
- Container not staying alive issue
- report.json generation failure

## How to Use the Current System

### Running a Single Task

```bash
pnpm tsx ./scripts/run_swe_bench_batch_env.ts \
  --instance_ids django__django-11001 \
  --use_gold_patch \
  --max_tasks 1
```

### Running Multiple Tasks

```bash
pnpm tsx ./scripts/run_swe_bench_batch_env.ts \
  --instance_ids "django__django-11001,astropy__astropy-6938,scikit-learn__scikit-learn-10508" \
  --use_gold_patch \
  --max_tasks 3
```

### Running Without Gold Patches (for agent evaluation)

```bash
pnpm tsx ./scripts/run_swe_bench_batch_env.ts \
  --instance_ids django__django-11001 \
  --max_tasks 1
# Note: Omit --use_gold_patch to use agent-generated patches
```

## Immediate Next Steps

### 1. Create Agent Integration Interface

The current system uses gold patches. To evaluate a coding agent, we need:

```typescript
// src/services/swe_bench_harness/AgentPatchGenerator.ts
interface AgentPatchGenerator {
  generatePatch(task: SWEBenchTask): Effect.Effect<string, AgentError>;
}
```

Implementation needed:
- Connect to the coding agent (AgentChatPane or Coder pane)
- Send task description and context to agent
- Parse agent's response to extract patch
- Handle multi-turn conversations if needed

### 2. Implement Batch Evaluation Pipeline

Create a pipeline that:
1. Loads SWE-bench tasks
2. For each task:
   - Sends to coding agent
   - Waits for patch generation
   - Runs evaluation
   - Collects results
3. Generates evaluation report

```typescript
// scripts/evaluate_agent_on_swebench.ts
const evaluateAgent = async (options: {
  taskIds: string[];
  agentConfig: AgentConfig;
  timeout: number;
}) => {
  const results = [];
  
  for (const taskId of options.taskIds) {
    // 1. Get task
    const task = await loadTask(taskId);
    
    // 2. Generate patch with agent
    const patch = await generatePatchWithAgent(task, options.agentConfig);
    
    // 3. Evaluate
    const result = await evaluateTask(taskId, patch);
    
    results.push(result);
  }
  
  return generateReport(results);
};
```

### 3. Add Evaluation Metrics

Implement proper metrics collection:

```typescript
interface EvaluationMetrics {
  // Success metrics
  resolved: boolean;
  testsPassRate: number;
  
  // Performance metrics
  timeToGenerate: number;
  dockerBuildTime: number;
  testExecutionTime: number;
  
  // Quality metrics
  patchSize: number;
  filesModified: number;
  testCoverage?: number;
  
  // Agent metrics
  tokensUsed: number;
  conversationTurns: number;
  agentModel: string;
}
```

### 4. Create Evaluation Dashboard

Build a UI to visualize results:
- Success rate over time
- Performance metrics
- Comparison between different agent configurations
- Task difficulty analysis

## Testing Recommendations

### 1. Baseline Testing

First, establish baselines with known patches:

```bash
# Test with SWE-bench Lite tasks (easier subset)
pnpm tsx ./scripts/run_swe_bench_batch_env.ts \
  --tasks_dir assets/swe_bench_lite_data \
  --use_gold_patch \
  --max_tasks 10
```

### 2. Agent Configuration Testing

Test different agent configurations:
- Different models (GPT-4, Claude, local models)
- Different prompting strategies
- With/without repository context
- With/without test hints

### 3. Performance Testing

Monitor and optimize:
- Docker image caching
- Parallel task execution
- Resource usage (CPU, memory, disk)
- Network bandwidth (for large repositories)

## Missing Components for Full Integration

### 1. Agent Context Management

The agent needs access to:
- Repository structure
- Relevant code files
- Test files
- Error messages from failed attempts

Implement:
```typescript
interface AgentContext {
  task: SWEBenchTask;
  repository: RepositoryInfo;
  relevantFiles: FileContent[];
  testFiles: FileContent[];
  previousAttempts?: AttemptHistory[];
}
```

### 2. Interactive Debugging Support

When tests fail, the agent might need to:
- See test output
- Run specific tests
- Explore the codebase
- Make multiple attempts

### 3. Resource Management

- Implement container pooling for faster execution
- Add resource limits per evaluation
- Clean up old Docker images/containers
- Monitor disk usage

### 4. Result Analysis Tools

Create tools to:
- Compare agent performance across different task categories
- Identify common failure patterns
- Generate improvement recommendations
- Export results in standard formats

## Implementation Roadmap

### Phase 1: Basic Agent Integration (1-2 days)
- [ ] Create AgentPatchGenerator interface
- [ ] Implement basic agent-to-patch pipeline
- [ ] Test with 5-10 simple tasks

### Phase 2: Batch Evaluation (2-3 days)
- [ ] Implement batch evaluation script
- [ ] Add progress tracking and resumption
- [ ] Create basic metrics collection

### Phase 3: Performance Optimization (2-3 days)
- [ ] Implement parallel evaluation
- [ ] Add Docker image caching strategy
- [ ] Optimize container lifecycle

### Phase 4: Analysis and Visualization (3-4 days)
- [ ] Create evaluation dashboard
- [ ] Implement result analysis tools
- [ ] Add comparison features

### Phase 5: Production Readiness (1 week)
- [ ] Add comprehensive error handling
- [ ] Implement resource management
- [ ] Create documentation
- [ ] Set up CI/CD integration

## Usage Examples for Developers

### Example 1: Evaluating a Specific Agent Configuration

```typescript
// evaluate-claude-on-django.ts
import { evaluateAgent } from './evaluate-agent';

const results = await evaluateAgent({
  agentProvider: 'anthropic',
  agentModel: 'claude-3-opus',
  taskFilter: (task) => task.repo.includes('django'),
  maxTasks: 50,
  timeout: 300000, // 5 minutes per task
  outputDir: './results/claude-django-evaluation'
});
```

### Example 2: Comparing Multiple Agents

```typescript
// compare-agents.ts
const agents = [
  { provider: 'openai', model: 'gpt-4' },
  { provider: 'anthropic', model: 'claude-3-opus' },
  { provider: 'ollama', model: 'codellama' }
];

for (const agent of agents) {
  await evaluateAgent({
    ...agent,
    taskIds: commonTaskSet,
    outputDir: `./results/${agent.provider}-${agent.model}`
  });
}

generateComparisonReport('./results');
```

### Example 3: Continuous Evaluation

```typescript
// continuous-evaluation.ts
// Run this as a cron job or GitHub Action
const runDailyEvaluation = async () => {
  const tasks = await selectRandomTasks(10);
  const results = await evaluateAgent({
    taskIds: tasks,
    agentConfig: getCurrentAgentConfig(),
    outputDir: `./daily-results/${new Date().toISOString()}`
  });
  
  await uploadResultsToDashboard(results);
  await notifyIfPerformanceRegression(results);
};
```

## Success Metrics

To consider the integration successful, we should achieve:

1. **Functionality**: Successfully evaluate 100+ SWE-bench tasks
2. **Performance**: Average evaluation time < 5 minutes per task
3. **Reliability**: < 5% infrastructure failure rate
4. **Usability**: Developers can run evaluations with single command
5. **Insights**: Clear visibility into agent performance patterns

## Conclusion

The foundation is solid. The next critical step is connecting the coding agent to generate patches instead of using gold patches. Once that's done, we can start gathering real performance data and iterating on agent improvements based on empirical results.