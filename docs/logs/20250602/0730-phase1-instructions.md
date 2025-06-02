# Phase 1: Effect-ifying SWE-Bench Infrastructure - Comprehensive Plan

## Executive Summary

We need to properly integrate Claude Code into the SWE-bench evaluation pipeline using Effect patterns. The current state shows:

1. **Infrastructure exists** but uses gold patches instead of AI-generated ones
2. **AgentPatchGeneratorService** is properly designed but not connected to Claude Code
3. **ChatOrchestratorService** has Claude Code support but only for Electron (IPC/WebSocket)
4. **No CLI-native Claude Code provider** that uses direct PTY execution

## Architecture Goals

1. **Create Effect-native Claude CLI executor** service
2. **Build proper CLI Layer composition** for SWE-bench
3. **Implement comprehensive testing** without heavy mocking
4. **Enable streaming patch generation** with real-time progress
5. **Support iteration on failed patches** using Effect patterns

## Core Design Principles

### 1. Service-Oriented Architecture
- Each capability is a distinct Effect Service
- Services declare their dependencies via Context
- Layers compose services with their implementations

### 2. Effect AI Patterns (from docs)
- Focus on "what" not "how" - declarative AI interactions
- Provider-agnostic logic with swappable implementations
- Type-level tracking of requirements

### 3. Testing Philosophy
- Prefer integration tests over unit tests with mocks
- Use Effect's TestServices for controlled environments
- Test actual CLI execution with real Claude responses

## Detailed Implementation Plan

### Phase 1A: Core Claude CLI Service (2-3 hours)

#### 1. Create ClaudeCliExecutorService

```typescript
// src/services/claude-cli/ClaudeCliExecutorService.ts
import { Effect, Context, Stream } from "effect";

export interface ClaudeCliExecutorService {
  readonly _tag: "ClaudeCliExecutorService";
  
  // Execute a single command and get full response
  execute(args: readonly string[]): Effect.Effect<string, ClaudeCliError>;
  
  // Stream execution for real-time output
  executeStream(args: readonly string[]): Stream.Stream<ClaudeCliChunk, ClaudeCliError>;
  
  // Check if Claude CLI is available and authenticated
  checkHealth(): Effect.Effect<ClaudeHealthStatus, ClaudeCliError>;
}

export const ClaudeCliExecutorService = Context.GenericTag<ClaudeCliExecutorService>("ClaudeCliExecutorService");
```

#### 2. Implement ClaudeCliExecutorServiceLive

```typescript
// src/services/claude-cli/ClaudeCliExecutorServiceLive.ts
import { Effect, Layer, Stream, Queue, Fiber } from "effect";
import * as pty from 'node-pty';
import { execSync } from 'child_process';

export const ClaudeCliExecutorServiceLive = Layer.effect(
  ClaudeCliExecutorService,
  Effect.gen(function* () {
    // Find Claude CLI path
    const claudePath = yield* findClaudePath();
    
    return {
      _tag: "ClaudeCliExecutorService",
      
      execute: (args) => 
        Effect.gen(function* () {
          // Implementation using node-pty
          // Extract from claude-bridge-service.js
        }),
        
      executeStream: (args) =>
        Stream.asyncScoped((emit) =>
          Effect.gen(function* () {
            // Streaming implementation
            // Parse JSON chunks and emit
          })
        ),
        
      checkHealth: () =>
        Effect.gen(function* () {
          // Run claude --version
          // Check authentication status
        })
    };
  })
);
```

### Phase 1B: Claude Code Provider for CLI (2-3 hours)

#### 3. Create ClaudeCodeNodeProvider

```typescript
// src/services/ai/providers/claude_code/ClaudeCodeNodeProvider.ts
import { Effect, Layer, pipe } from "effect";
import { makeAgentLanguageModel, type AgentLanguageModel } from "@/services/ai/core";
import { ClaudeCliExecutorService } from "@/services/claude-cli";

export const ClaudeCodeNodeProviderLive = Layer.effect(
  AgentLanguageModel.Tag,
  Effect.gen(function* () {
    const cliExecutor = yield* ClaudeCliExecutorService;
    
    return makeAgentLanguageModel({
      generateText: (options) =>
        Effect.gen(function* () {
          // Build Claude CLI args from options
          const args = buildClaudeArgs(options);
          
          // Execute and parse response
          const response = yield* cliExecutor.execute(args);
          const parsed = parseClaudeResponse(response);
          
          return AiResponse.fromSimple({
            text: parsed.content,
            metadata: { usage: parsed.usage }
          });
        }),
        
      streamText: (options) =>
        pipe(
          cliExecutor.executeStream(buildClaudeArgs(options)),
          Stream.map(chunk => 
            AiResponse.fromSimple({ text: chunk.delta.text })
          )
        ),
        
      generateStructured: (options) =>
        // Use generateText and parse JSON
    });
  })
);
```

### Phase 1C: CLI Layer Composition (2-3 hours)

#### 4. Create Dedicated SWE-Bench CLI Layer

```typescript
// src/services/swe_bench_harness/cli-layers.ts
import { Layer } from "effect";

// Base services needed for CLI
const BaseCliLayer = Layer.mergeAll(
  ConfigurationServiceLive,
  TelemetryServiceCliLive, // CLI-specific telemetry
  SparkServiceLive
);

// Claude CLI services
const ClaudeCliLayer = Layer.mergeAll(
  ClaudeCliExecutorServiceLive,
  ClaudeCodeNodeProviderLive
);

// AI orchestration layer
const AiOrchestrationLayer = ChatOrchestratorServiceLive.pipe(
  Layer.provide(ClaudeCliLayer),
  Layer.provide(BaseCliLayer)
);

// SWE-bench specific services
const SWEBenchServicesLayer = Layer.mergeAll(
  SWEBenchTaskServiceLive,
  AgentPatchGeneratorServiceLive,
  DockerBuildManagerServiceLive,
  SWEBenchEnvironmentSetupServiceLive,
  SWEBenchEvaluationScriptServiceLive
);

// Complete CLI layer for SWE-bench
export const SWEBenchCliLayer = Layer.mergeAll(
  SWEBenchServicesLayer,
  SWEBenchHarnessServiceLive
).pipe(
  Layer.provide(AiOrchestrationLayer),
  Layer.provide(BaseCliLayer)
);
```

### Phase 1D: Testing Strategy (3-4 hours)

#### 5. Integration Tests with Real Claude

```typescript
// src/services/claude-cli/__tests__/ClaudeCliExecutorService.test.ts
import { Effect, TestClock, TestContext } from "effect";
import { describe, test, expect } from "vitest";

describe("ClaudeCliExecutorService", () => {
  test("executes simple prompt", () =>
    Effect.gen(function* () {
      const executor = yield* ClaudeCliExecutorService;
      
      // Real execution, no mocks
      const response = yield* executor.execute([
        '-p', 'Say "Hello, Effect!"',
        '--output-format', 'text'
      ]);
      
      expect(response).toContain("Hello, Effect!");
    }).pipe(
      Effect.provide(ClaudeCliExecutorServiceLive),
      Effect.runPromise
    )
  );
  
  test("streams responses", () =>
    Effect.gen(function* () {
      const executor = yield* ClaudeCliExecutorService;
      const chunks: string[] = [];
      
      yield* executor.executeStream([
        '-p', 'Count from 1 to 5',
        '--output-format', 'stream-json'
      ]).pipe(
        Stream.tap(chunk => 
          Effect.sync(() => chunks.push(chunk.delta.text))
        ),
        Stream.runDrain
      );
      
      expect(chunks.join('')).toMatch(/1.*2.*3.*4.*5/);
    }).pipe(
      Effect.provide(ClaudeCliExecutorServiceLive),
      Effect.runPromise
    )
  );
});
```

#### 6. End-to-End Patch Generation Tests

```typescript
// src/services/swe_bench_harness/__tests__/AgentPatchGeneratorService.integration.test.ts
describe("AgentPatchGeneratorService Integration", () => {
  test("generates patch for simple Python fix", () =>
    Effect.gen(function* () {
      const patchGenerator = yield* AgentPatchGeneratorService;
      
      // Create a simple test task
      const testTask: SWEBenchTask = {
        instance_id: "test-simple-fix",
        repo: "test/repo",
        problem_statement: "The function add(a, b) returns a - b instead of a + b",
        // ... other fields
      };
      
      // Generate patch using real Claude
      const patch = yield* patchGenerator.generatePatch(
        testTask,
        "/tmp/test-repo",
        "claude_code"
      );
      
      // Verify patch format
      expect(patch).toMatch(/^diff --git/);
      expect(patch).toContain("-    return a - b");
      expect(patch).toContain("+    return a + b");
    }).pipe(
      Effect.provide(SWEBenchCliLayer),
      Effect.runPromise
    )
  );
});
```

### Phase 1E: Streaming and Progress Reporting (2-3 hours)

#### 7. Enhanced Patch Generator with Streaming

```typescript
// src/services/swe_bench_harness/AgentPatchGeneratorServiceEnhanced.ts
export interface AgentPatchGeneratorService {
  // Existing method
  generatePatch(...): Effect.Effect<string, ...>;
  
  // New streaming method
  generatePatchStream(
    task: SWEBenchTask,
    repoPath: string,
    provider: string
  ): Stream.Stream<PatchGenerationEvent, AgentPatchGenerationError>;
}

export type PatchGenerationEvent = 
  | { _tag: "Thinking"; content: string }
  | { _tag: "AnalyzingCode"; files: string[] }
  | { _tag: "GeneratingPatch"; progress: number }
  | { _tag: "PatchChunk"; content: string }
  | { _tag: "Complete"; patch: string };
```

### Phase 1F: Iteration Support (2-3 hours)

#### 8. Iterative Patch Improvement

```typescript
// src/services/swe_bench_harness/PatchIterationService.ts
export interface PatchIterationService {
  improveFailedPatch(params: {
    task: SWEBenchTask;
    previousPatch: string;
    testOutput: string;
    attempt: number;
  }): Effect.Effect<string, PatchIterationError>;
}

export const PatchIterationServiceLive = Layer.effect(
  PatchIterationService,
  Effect.gen(function* () {
    const patchGenerator = yield* AgentPatchGeneratorService;
    
    return {
      improveFailedPatch: (params) =>
        Effect.gen(function* () {
          // Build enhanced prompt with failure context
          const enhancedTask = {
            ...params.task,
            problem_statement: buildIterativePrompt(params)
          };
          
          // Generate improved patch
          return yield* patchGenerator.generatePatch(
            enhancedTask,
            params.repoPath,
            "claude_code"
          );
        })
    };
  })
);
```

## Implementation Order

### Day 1 (Today - Critical Path)
1. **Morning (2-3 hours)**
   - Extract ClaudeCliExecutorService from bridge
   - Implement basic execute() method
   - Write integration test

2. **Midday (2-3 hours)**  
   - Create ClaudeCodeNodeProvider
   - Wire up to ChatOrchestratorService
   - Test patch generation

3. **Afternoon (2-3 hours)**
   - Fix CLI layer composition
   - Create SWEBenchCliLayer
   - Run first real SWE-bench task

### Day 2 (Follow-up)
1. **Streaming Implementation**
   - Add executeStream() to CLI executor
   - Enhance patch generator with streaming
   - Progress reporting

2. **Iteration Support**
   - PatchIterationService
   - Enhanced prompts with test output
   - Retry logic

3. **Comprehensive Testing**
   - Full integration test suite
   - Performance benchmarks
   - Error case coverage

## Key Technical Decisions

### 1. Why Service Pattern?
- Clean separation of concerns
- Easy to test in isolation
- Swappable implementations

### 2. Why Direct PTY over WebSocket?
- Simpler for CLI scripts
- Lower latency
- Fewer moving parts

### 3. Why Stream-based APIs?
- Real-time progress updates
- Better resource management
- Natural fit for Effect patterns

### 4. Testing Approach
- Real Claude interactions (not mocked)
- Use TestClock for time-dependent tests
- TestContext for configuration overrides

## Success Criteria

1. **Functional Requirements**
   - ✅ Generate patches using Claude Code
   - ✅ Run evaluations with generated patches
   - ✅ Report real AI success rates
   - ✅ Support iteration on failures

2. **Technical Requirements**
   - ✅ Proper Effect service architecture
   - ✅ No circular dependencies
   - ✅ CLI-native implementation
   - ✅ Comprehensive test coverage

3. **Performance Targets**
   - Patch generation: < 30s per task
   - Streaming updates: < 100ms latency
   - Memory usage: < 500MB per task

## Common Pitfalls to Avoid

1. **Don't Mock Claude CLI**
   - Use real CLI for integration tests
   - Mock only for unit tests if needed

2. **Don't Mix Platforms**
   - Keep Electron/IPC code separate
   - CLI should use direct execution

3. **Don't Ignore Errors**
   - Proper error types for each failure mode
   - Detailed error messages for debugging

4. **Don't Skip Streaming**
   - Users want real-time feedback
   - Essential for long-running tasks

## Resources and References

1. **Effect AI Documentation**
   - [Getting Started](https://effect.website/docs/ai/getting-started/)
   - [Tool Use](https://effect.website/docs/ai/tool-use/)
   - Focus on service patterns and providers

2. **Existing Code to Study**
   - `src/services/ai/providers/nip90/` - Good provider example
   - `src/services/nostr/NostrServiceImpl.ts` - Service pattern
   - `src/services/spark/SparkServiceImpl.ts` - Effect testing

3. **Key Files to Modify**
   - `src/services/runtime.ts` - Add Claude provider
   - `src/services/ai/orchestration/ChatOrchestratorService.ts` - Update routing
   - `src/services/swe_bench_harness/cli-harness-layer.ts` - Fix composition

## Next Immediate Steps

1. **Start with ClaudeCliExecutorService.ts**
   - Copy PTY logic from bridge
   - Wrap in Effect service pattern
   - Test with simple prompt

2. **Then ClaudeCodeNodeProvider.ts**
   - Implement AgentLanguageModel interface
   - Use ClaudeCliExecutorService
   - Test with ChatOrchestratorService

3. **Finally run-swebench-with-effect.ts**
   - Use proper layer composition
   - Generate real patches
   - Report success rates

---

**Remember**: The goal is not just to make it work, but to make it work *the Effect way* - with proper services, layers, and testing. No shortcuts, no mocks, just clean Effect architecture.

*Generated: 2025-06-02 07:30 PST*