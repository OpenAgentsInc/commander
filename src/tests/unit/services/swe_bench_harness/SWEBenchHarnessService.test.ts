import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Effect, Exit, Layer, Stream } from 'effect';
import { FileSystem } from '@effect/platform/FileSystem';
import { SWEBenchHarnessService } from '@/services/swe_bench_harness/SWEBenchHarnessService';
import { SWEBenchHarnessServiceLive } from '@/services/swe_bench_harness/SWEBenchHarnessServiceImpl';
import { SWEBenchTaskService } from '@/services/swe_bench_harness/SWEBenchTaskService';
import { SWEBenchEvaluationScriptService } from '@/services/swe_bench_harness/SWEBenchEvaluationScriptService';
import { SWEBenchLifecycleService } from '@/services/swe_bench_harness/SWEBenchLifecycleService';
import { AgentPatchGeneratorService } from '@/services/swe_bench_harness/AgentPatchGeneratorService';
import { SWEBenchPythonBridgeService, PythonBridgeError } from '@/services/swe_bench_harness/SWEBenchPythonBridgeService';
import { TelemetryService } from '@/services/telemetry';
import { HarnessError, TaskNotFoundError, ScriptBuildError, LifecycleSetupError, LifecycleEvalError } from '@/services/swe_bench_harness/errors';
import type { SWEBenchTask, ContainerContext, EvaluationReport } from '@/services/swe_bench_harness/types';

const mockTrackEvent = vi.fn(() => Effect.void);

const mockTelemetryService = TelemetryService.of({
  trackEvent: mockTrackEvent,
  isEnabled: () => Effect.succeed(true),
  setEnabled: () => Effect.void,
});

const sampleTask: SWEBenchTask = {
  instance_id: "test-instance-1",
  repo: "test-owner/test-repo",
  base_commit: "abc123",
  problem_statement: "Fix the bug",
  test_patch: "diff --git a/test.py b/test.py\n...",
  version: "1.0",
  FAIL_TO_PASS: ["test_case1"],
  PASS_TO_PASS: ["test_case2"],
};

const mockContainerContext: ContainerContext = {
  containerId: "container-123",
  hostEvalDir: "/tmp/swe-bench/task-xyz",
  containerEvalDir: "/swe_bench_workdir/test-instance-1",
  containerRepoPath: "/swe_bench_workdir/test-instance-1/test-repo",
  imageName: "swe-bench-task/test-instance-1:latest",
  hostBuildCtxDir: "/tmp/swe-bench-build-test-instance-1"
};

const mockReport: EvaluationReport = {
  instance_id: "test-instance-1",
  patch_applied_successfully: true,
  tests_passed: true,
  resolved: true,
};

// Create a mock FileSystem
const createMockFileSystem = () => ({
  makeTempDirectory: vi.fn(() => Effect.succeed("/tmp/test")),
  writeFileString: vi.fn(() => Effect.void),
  chmod: vi.fn(() => Effect.void),
  remove: vi.fn(() => Effect.void),
  readFileString: vi.fn(),
  readDirectory: vi.fn(),
  exists: vi.fn(() => Effect.succeed(true)),
  writeFile: vi.fn(() => Effect.succeed(undefined)),
  readFile: vi.fn(() => Effect.succeed(new Uint8Array())),
  copy: vi.fn(() => Effect.succeed(undefined)),
  copyAll: vi.fn(() => Effect.succeed(undefined)),
  makeDirectory: vi.fn(() => Effect.succeed(undefined)),
  makeTempDirectoryScoped: vi.fn(() => Effect.succeed("")),
  makeTempFile: vi.fn(() => Effect.succeed("")),
  makeTempFileScoped: vi.fn(() => Effect.succeed("")),
  open: vi.fn(() => Effect.succeed(null as any)),
  sink: vi.fn(() => null as any),
  stream: vi.fn(() => null as any),
  stat: vi.fn(() => Effect.succeed({} as any)),
  readLink: vi.fn(() => Effect.succeed("")),
  symlink: vi.fn(() => Effect.succeed(undefined)),
  truncate: vi.fn(() => Effect.succeed(undefined)),
  utimes: vi.fn(() => Effect.succeed(undefined)),
  watch: vi.fn(() => null as any),
} as any);

describe('SWEBenchHarnessService', () => {
  let testLayer: Layer.Layer<SWEBenchHarnessService, never, never>;
  
  // Helper to provide both test layer and FileSystem
  const provideTestDependencies = <R, E, A>(effect: Effect.Effect<A, E, R | SWEBenchHarnessService>) => {
    const mockFileSystem = createMockFileSystem();
    return effect.pipe(
      Effect.provide(testLayer),
      Effect.provide(Layer.succeed(FileSystem, mockFileSystem))
    );
  };
  
  const mockGetTask = vi.fn();
  const mockBuildEvalScript = vi.fn();
  const mockSetupContainerForTask = vi.fn();
  const mockRunEvaluationInContainer = vi.fn();
  const mockCleanupContainerResources = vi.fn();

  const mockTaskService = SWEBenchTaskService.of({
    getTask: mockGetTask,
    listAvailableTaskIds: vi.fn(() => Effect.succeed([])),
  });

  const mockScriptService = SWEBenchEvaluationScriptService.of({
    buildEvalScript: mockBuildEvalScript,
  });

  const mockLifecycleService = SWEBenchLifecycleService.of({
    setupContainerForTask: mockSetupContainerForTask,
    runEvaluationInContainer: mockRunEvaluationInContainer,
    cleanupContainerResources: mockCleanupContainerResources,
  });

  const mockAgentPatchGenerator = AgentPatchGeneratorService.of({
    generatePatch: vi.fn(() => Effect.succeed("generated patch content"))
  });

  const mockPythonBridge = SWEBenchPythonBridgeService.of({
    initialize: vi.fn(() => Effect.succeed(undefined)),
    runEvaluation: vi.fn(() => Stream.fail(new PythonBridgeError({ message: "Python bridge not mocked for this test" }))),
    isInitialized: vi.fn(() => Effect.succeed(false))
  });

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set default successful mock behaviors
    mockGetTask.mockReturnValue(Effect.succeed(sampleTask));
    mockBuildEvalScript.mockReturnValue(Effect.succeed("#!/bin/bash\necho 'test'"));
    mockSetupContainerForTask.mockReturnValue(Effect.succeed(mockContainerContext));
    mockRunEvaluationInContainer.mockReturnValue(Effect.succeed(mockReport));
    mockCleanupContainerResources.mockReturnValue(Effect.void);

    const mockFileSystem = createMockFileSystem();
    
    testLayer = SWEBenchHarnessServiceLive.pipe(
      Layer.provide(Layer.succeed(SWEBenchTaskService, mockTaskService)),
      Layer.provide(Layer.succeed(SWEBenchEvaluationScriptService, mockScriptService)),
      Layer.provide(Layer.succeed(SWEBenchLifecycleService, mockLifecycleService)),
      Layer.provide(Layer.succeed(AgentPatchGeneratorService, mockAgentPatchGenerator)),
      Layer.provide(Layer.succeed(SWEBenchPythonBridgeService, mockPythonBridge)),
      Layer.provide(Layer.succeed(TelemetryService, mockTelemetryService))
    );
  });

  describe('evaluateTask', () => {
    it('should successfully evaluate a task with content patch', async () => {
      const program = provideTestDependencies(
        Effect.gen(function* () {
          const service = yield* SWEBenchHarnessService;
          return yield* service.evaluateTask("test-instance-1", { type: "content", content: "patch content" });
        })
      );

      const result = await Effect.runPromiseExit(program);

      expect(Exit.isSuccess(result)).toBe(true);
      if (Exit.isSuccess(result)) {
        const evaluationResult = result.value;
        expect(evaluationResult.instance_id).toBe("test-instance-1");
        expect(evaluationResult.report).toEqual(mockReport);
        expect(evaluationResult.duration_ms).toBeDefined();
        expect(evaluationResult.patch_source_type).toBe("content");
      }

      // Verify service calls
      expect(mockGetTask).toHaveBeenCalledWith("test-instance-1");
      expect(mockSetupContainerForTask).toHaveBeenCalledWith(sampleTask);
      expect(mockBuildEvalScript).toHaveBeenCalledWith(
        sampleTask,
        "patch.diff",
        mockContainerContext.containerEvalDir,
        mockContainerContext.containerRepoPath,
        "test_patch.diff"
      );
      expect(mockRunEvaluationInContainer).toHaveBeenCalledWith(
        mockContainerContext,
        "#!/bin/bash\necho 'test'",
        "patch content",
        "patch.diff",
        sampleTask.test_patch
      );
      expect(mockCleanupContainerResources).toHaveBeenCalledWith(mockContainerContext);

      // Verify telemetry events
      expect(mockTrackEvent).toHaveBeenCalledWith({
        category: "swe_bench_harness",
        action: "evaluate_task_start",
        label: "test-instance-1"
      });
      expect(mockTrackEvent).toHaveBeenCalledWith({
        category: "swe_bench_harness",
        action: "container_setup_success",
        label: "test-instance-1",
        value: "container-123"
      });
      expect(mockTrackEvent).toHaveBeenCalledWith({
        category: "swe_bench_harness",
        action: "evaluate_task_success",
        label: "test-instance-1",
        value: expect.stringContaining("resolved")
      });
    });

    it('should handle task not found error', async () => {
      const error = new TaskNotFoundError({ instanceId: "test-instance-1" });
      mockGetTask.mockReturnValue(Effect.fail(error));

      const program = provideTestDependencies(
        Effect.gen(function* () {
          const service = yield* SWEBenchHarnessService;
          return yield* service.evaluateTask("test-instance-1", { type: "content", content: "patch content" });
        })
      );

      const result = await Effect.runPromiseExit(program);

      expect(Exit.isFailure(result)).toBe(true);
      if (Exit.isFailure(result) && result.cause._tag === 'Fail') {
        expect(result.cause.error).toBeInstanceOf(TaskNotFoundError);
      }

      expect(mockSetupContainerForTask).not.toHaveBeenCalled();
      expect(mockCleanupContainerResources).not.toHaveBeenCalled();
    });

    it('should handle container setup error', async () => {
      const error = new LifecycleSetupError({ message: "Failed to create container" });
      mockSetupContainerForTask.mockReturnValue(Effect.fail(error));

      const program = provideTestDependencies(
        Effect.gen(function* () {
          const service = yield* SWEBenchHarnessService;
          return yield* service.evaluateTask("test-instance-1", { type: "content", content: "patch content" });
        })
      );

      const result = await Effect.runPromiseExit(program);

      expect(Exit.isFailure(result)).toBe(true);
      if (Exit.isFailure(result) && result.cause._tag === 'Fail') {
        expect(result.cause.error).toBeInstanceOf(LifecycleSetupError);
      }

      expect(mockRunEvaluationInContainer).not.toHaveBeenCalled();
      expect(mockCleanupContainerResources).not.toHaveBeenCalled();

      // Verify error telemetry
      expect(mockTrackEvent).toHaveBeenCalledWith({
        category: "swe_bench_harness",
        action: "container_setup_error",
        label: "test-instance-1",
        value: "Failed to create container"
      });
    });

    it('should handle script build error', async () => {
      const error = new ScriptBuildError({ message: "Invalid task configuration" });
      mockBuildEvalScript.mockReturnValue(Effect.fail(error));

      const program = provideTestDependencies(
        Effect.gen(function* () {
          const service = yield* SWEBenchHarnessService;
          return yield* service.evaluateTask("test-instance-1", { type: "content", content: "patch content" });
        })
      );

      const result = await Effect.runPromiseExit(program);

      expect(Exit.isFailure(result)).toBe(true);
      if (Exit.isFailure(result) && result.cause._tag === 'Fail') {
        expect(result.cause.error).toBeInstanceOf(ScriptBuildError);
      }

      // Cleanup should still be called
      expect(mockCleanupContainerResources).toHaveBeenCalledWith(mockContainerContext);
    });

    it('should handle evaluation error', async () => {
      const error = new LifecycleEvalError({ 
        message: "Evaluation failed", 
        exitCode: 1,
        stderr: "Error output"
      });
      mockRunEvaluationInContainer.mockReturnValue(Effect.fail(error));

      const program = provideTestDependencies(
        Effect.gen(function* () {
          const service = yield* SWEBenchHarnessService;
          return yield* service.evaluateTask("test-instance-1", { type: "content", content: "patch content" });
        })
      );

      const result = await Effect.runPromiseExit(program);

      expect(Exit.isFailure(result)).toBe(true);
      if (Exit.isFailure(result) && result.cause._tag === 'Fail') {
        expect(result.cause.error).toBeInstanceOf(LifecycleEvalError);
      }

      // Cleanup should still be called
      expect(mockCleanupContainerResources).toHaveBeenCalledWith(mockContainerContext);
    });

    it('should cleanup resources even if evaluation fails', async () => {
      const evalError = new LifecycleEvalError({ message: "Eval failed" });
      mockRunEvaluationInContainer.mockReturnValue(Effect.fail(evalError));

      const program = provideTestDependencies(
        Effect.gen(function* () {
          const service = yield* SWEBenchHarnessService;
          return yield* service.evaluateTask("test-instance-1", { type: "content", content: "patch content" });
        })
      );

      const result = await Effect.runPromiseExit(program);

      expect(Exit.isFailure(result)).toBe(true);
      expect(mockCleanupContainerResources).toHaveBeenCalledWith(mockContainerContext);
    });

    it('should ignore cleanup errors and return evaluation result', async () => {
      const cleanupError = new Error("Cleanup failed");
      mockCleanupContainerResources.mockReturnValue(Effect.fail(cleanupError));

      const program = provideTestDependencies(
        Effect.gen(function* () {
          const service = yield* SWEBenchHarnessService;
          return yield* service.evaluateTask("test-instance-1", { type: "content", content: "patch content" });
        })
      );

      const result = await Effect.runPromiseExit(program);

      // Should still succeed despite cleanup error
      expect(Exit.isSuccess(result)).toBe(true);
      if (Exit.isSuccess(result)) {
        expect(result.value.instance_id).toBe("test-instance-1");
        expect(result.value.report).toEqual(mockReport);
      }

      // Verify cleanup error telemetry
      expect(mockTrackEvent).toHaveBeenCalledWith({
        category: "swe_bench_harness",
        action: "container_cleanup_error",
        label: "test-instance-1",
        value: "Cleanup failed"
      });
    });

    it.skip('should wrap unknown errors as HarnessError', async () => {
      const unknownError = new Error("Unknown error");
      mockGetTask.mockReturnValue(Effect.fail(unknownError));

      const program = provideTestDependencies(
        Effect.gen(function* () {
          const service = yield* SWEBenchHarnessService;
          return yield* service.evaluateTask("test-instance-1", { type: "content", content: "patch content" });
        })
      );

      const result = await Effect.runPromiseExit(program);

      expect(Exit.isFailure(result)).toBe(true);
      if (Exit.isFailure(result) && result.cause._tag === 'Fail') {
        const error = result.cause.error;
        expect(error).toBeInstanceOf(HarnessError);
        if (error instanceof HarnessError) {
          expect(error.message).toContain("Evaluation failed for test-instance-1");
          expect(error.instanceId).toBe("test-instance-1");
          expect(error.cause).toBe(unknownError);
        }
      }
    });

    it('should successfully evaluate a task with gold patch', async () => {
      const taskWithGoldPatch = { ...sampleTask, patch: "gold patch content" };
      mockGetTask.mockReturnValue(Effect.succeed(taskWithGoldPatch));

      const program = provideTestDependencies(
        Effect.gen(function* () {
          const service = yield* SWEBenchHarnessService;
          return yield* service.evaluateTask("test-instance-1", { type: "gold" });
        })
      );

      const result = await Effect.runPromiseExit(program);

      expect(Exit.isSuccess(result)).toBe(true);
      if (Exit.isSuccess(result)) {
        const evaluationResult = result.value;
        expect(evaluationResult.patch_source_type).toBe("gold");
      }

      // Verify correct patch was used
      expect(mockRunEvaluationInContainer).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        "gold patch content",
        expect.anything(),
        expect.anything()
      );
    });

    it('should successfully evaluate a task with agent-generated patch', async () => {
      const mockGeneratePatch = vi.fn(() => Effect.succeed("ai-generated patch"));
      const mockAgentPatchGeneratorWithSpy = AgentPatchGeneratorService.of({
        generatePatch: mockGeneratePatch
      });

      const testLayerWithAgent = SWEBenchHarnessServiceLive.pipe(
        Layer.provide(Layer.succeed(SWEBenchTaskService, mockTaskService)),
        Layer.provide(Layer.succeed(SWEBenchEvaluationScriptService, mockScriptService)),
        Layer.provide(Layer.succeed(SWEBenchLifecycleService, mockLifecycleService)),
        Layer.provide(Layer.succeed(AgentPatchGeneratorService, mockAgentPatchGeneratorWithSpy)),
        Layer.provide(Layer.succeed(SWEBenchPythonBridgeService, mockPythonBridge)),
        Layer.provide(Layer.succeed(TelemetryService, mockTelemetryService))
      );

      const mockFileSystem = createMockFileSystem();
      const program = Effect.gen(function* () {
        const service = yield* SWEBenchHarnessService;
        return yield* service.evaluateTask("test-instance-1", { type: "agent_generated", providerKey: "claude_code" });
      }).pipe(
        Effect.provide(testLayerWithAgent),
        Effect.provide(Layer.succeed(FileSystem, mockFileSystem))
      );

      const result = await Effect.runPromiseExit(program);

      expect(Exit.isSuccess(result)).toBe(true);
      if (Exit.isSuccess(result)) {
        const evaluationResult = result.value;
        expect(evaluationResult.patch_source_type).toBe("agent_generated");
        expect(evaluationResult.generated_patch_content).toBe("ai-generated patch");
      }

      // Verify agent was called
      expect(mockGeneratePatch).toHaveBeenCalledWith(
        sampleTask,
        expect.stringContaining("test-repo"),
        "claude_code"
      );

      // Verify correct patch was used
      expect(mockRunEvaluationInContainer).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        "ai-generated patch",
        expect.anything(),
        expect.anything()
      );
    });
  });
});