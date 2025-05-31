import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Effect, Exit, Layer } from 'effect';
import { FileSystem } from '@effect/platform/FileSystem';
import { DockerUtilsService, DockerError, DockerOperationError } from '@/services/docker';
import { ConfigurationService, ConfigError } from '@/services/configuration';
import { TelemetryService } from '@/services/telemetry';
import { SWEBenchLifecycleService } from '@/services/swe_bench_harness/SWEBenchLifecycleService';
import { SWEBenchLifecycleServiceLive } from '@/services/swe_bench_harness/SWEBenchLifecycleServiceImpl';
import { LifecycleSetupError, LifecycleEvalError } from '@/services/swe_bench_harness/errors';
import type { SWEBenchTask, ContainerContext } from '@/services/swe_bench_harness/types';

// Mock simple-git
vi.mock('simple-git', () => ({
  default: () => ({
    clone: vi.fn().mockResolvedValue(undefined),
    cwd: vi.fn().mockReturnThis(),
    checkout: vi.fn().mockResolvedValue(undefined),
  })
}));

const mockTrackEvent = vi.fn(() => Effect.void);
const mockMakeTempDirectory = vi.fn();
const mockWriteFileString = vi.fn(() => Effect.void);
const mockChmod = vi.fn(() => Effect.void);
const mockRemove = vi.fn(() => Effect.void);

// Create mock services
const createMockFileSystem = () => ({
  makeTempDirectory: mockMakeTempDirectory,
  writeFileString: mockWriteFileString,
  chmod: mockChmod,
  remove: mockRemove,
  // Add other required FileSystem methods as stubs
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

const mockConfigService = ConfigurationService.of({
  get: vi.fn((key: string) => {
    switch (key) {
      case "SWE_BENCH_HOST_TEMP_DIR": return Effect.succeed("/tmp/swe-bench");
      case "SWE_BENCH_CONTAINER_WORKDIR": return Effect.succeed("/swe_bench_workdir");
      case "SWE_BENCH_DOCKER_IMAGE_NAME": return Effect.succeed("swe-bench:latest");
      default: return Effect.fail(new ConfigError({ message: `Unknown key: ${key}` }));
    }
  }),
  getSecret: vi.fn(() => Effect.fail(new ConfigError({ message: "Not implemented" }))),
  set: vi.fn(() => Effect.void),
  delete: vi.fn(() => Effect.void),
});

const mockTelemetryService = TelemetryService.of({
  trackEvent: mockTrackEvent,
  isEnabled: () => Effect.succeed(true),
  setEnabled: () => Effect.void,
});

const mockCreateContainer = vi.fn();
const mockStartContainer = vi.fn(() => Effect.void);
const mockStopContainer = vi.fn();
const mockRemoveContainer = vi.fn(() => Effect.void);
const mockExecInContainer = vi.fn();
const mockCopyFromContainer = vi.fn();

const mockDockerService = DockerUtilsService.of({
  listContainers: vi.fn(),
  pullImage: vi.fn(),
  createContainer: mockCreateContainer,
  startContainer: mockStartContainer,
  stopContainer: mockStopContainer,
  removeContainer: mockRemoveContainer,
  copyToContainer: vi.fn(() => Effect.void),
  copyFromContainer: mockCopyFromContainer,
  execInContainer: mockExecInContainer,
});

describe('SWEBenchLifecycleService', () => {
  let testLayer: Layer.Layer<SWEBenchLifecycleService, never, never>;

  const sampleTask: SWEBenchTask = {
    instance_id: "test-task-1",
    repo: "test-owner/test-repo",
    base_commit: "abc123",
    problem_statement: "Fix the bug.",
    test_patch: "diff --git a/test.py b/test.py\n...",
    version: "1.0",
    FAIL_TO_PASS: ["test_case1"],
    PASS_TO_PASS: ["test_case2"],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Set default mock behaviors
    mockStopContainer.mockReturnValue(Effect.void);
    
    const mockFileSystem = createMockFileSystem();
    testLayer = SWEBenchLifecycleServiceLive.pipe(
      Layer.provide(Layer.succeed(FileSystem, mockFileSystem)),
      Layer.provide(Layer.succeed(ConfigurationService, mockConfigService)),
      Layer.provide(Layer.succeed(TelemetryService, mockTelemetryService)),
      Layer.provide(Layer.succeed(DockerUtilsService, mockDockerService))
    );
  });

  describe('setupContainerForTask', () => {
    it('should set up container successfully', async () => {
      const tempDir = "/tmp/swe-bench/swe-bench-test-task-1-xyz";
      mockMakeTempDirectory.mockReturnValue(Effect.succeed(tempDir));
      mockCreateContainer.mockReturnValue(Effect.succeed("container-123"));

      const program = Effect.gen(function* () {
        const service = yield* SWEBenchLifecycleService;
        return yield* service.setupContainerForTask(sampleTask);
      }).pipe(
        Effect.provide(testLayer),
        Effect.provide(Layer.succeed(FileSystem, createMockFileSystem()))
      );

      const result = await Effect.runPromiseExit(program);

      expect(Exit.isSuccess(result)).toBe(true);
      if (Exit.isSuccess(result)) {
        const context = result.value;
        expect(context.containerId).toBe("container-123");
        expect(context.hostEvalDir).toBe(tempDir);
        expect(context.containerEvalDir).toBe("/swe_bench_workdir/test-task-1");
        expect(context.containerRepoPath).toBe("/swe_bench_workdir/test-task-1/test-repo");
      }

      expect(mockMakeTempDirectory).toHaveBeenCalledWith({
        directory: "/tmp/swe-bench",
        prefix: "swe-bench-test-task-1-"
      });
      expect(mockCreateContainer).toHaveBeenCalled();
      expect(mockStartContainer).toHaveBeenCalledWith("container-123");
    });

    it('should handle setup errors', async () => {
      mockMakeTempDirectory.mockReturnValue(Effect.fail(new Error("Disk full")));

      const program = Effect.gen(function* () {
        const service = yield* SWEBenchLifecycleService;
        return yield* service.setupContainerForTask(sampleTask);
      }).pipe(
        Effect.provide(testLayer),
        Effect.provide(Layer.succeed(FileSystem, createMockFileSystem()))
      );

      const result = await Effect.runPromiseExit(program);

      expect(Exit.isFailure(result)).toBe(true);
      if (Exit.isFailure(result) && result.cause._tag === 'Fail') {
        expect(result.cause.error).toBeInstanceOf(LifecycleSetupError);
      }
    });
  });

  describe('runEvaluationInContainer', () => {
    const mockContext: ContainerContext = {
      containerId: "container-123",
      hostEvalDir: "/tmp/swe-bench/task-xyz",
      containerEvalDir: "/swe_bench_workdir/test-task-1",
      containerRepoPath: "/swe_bench_workdir/test-task-1/test-repo",
    };

    it('should run evaluation successfully', async () => {
      const mockExecResult = {
        stdout: "Evaluation complete",
        stderr: "",
        exitCode: 0
      };
      mockExecInContainer.mockReturnValue(Effect.succeed(mockExecResult));

      // Mock TAR stream containing report.json
      const mockReportContent = JSON.stringify({
        instance_id: "test-task-1",
        patch_applied_successfully: true,
        tests_passed: true,
        resolved: true
      });

      const { Readable } = await import('stream');
      const tarStream = require('tar-stream');
      const pack = tarStream.pack();
      pack.entry({ name: 'report.json' }, mockReportContent, () => {
        pack.finalize();
      });

      mockCopyFromContainer.mockReturnValue(Effect.succeed(pack));

      const program = Effect.gen(function* () {
        const service = yield* SWEBenchLifecycleService;
        return yield* service.runEvaluationInContainer(
          mockContext,
          "#!/bin/bash\necho 'test'",
          "patch content"
        );
      }).pipe(
        Effect.provide(testLayer),
        Effect.provide(Layer.succeed(FileSystem, createMockFileSystem()))
      );

      const result = await Effect.runPromiseExit(program);

      expect(Exit.isSuccess(result)).toBe(true);
      if (Exit.isSuccess(result)) {
        const report = result.value;
        expect(report.instance_id).toBe("test-task-1");
        expect(report.resolved).toBe(true);
      }

      expect(mockWriteFileString).toHaveBeenCalledWith(
        "/tmp/swe-bench/task-xyz/patch.diff",
        "patch content"
      );
      expect(mockWriteFileString).toHaveBeenCalledWith(
        "/tmp/swe-bench/task-xyz/eval.sh",
        "#!/bin/bash\necho 'test'"
      );
      expect(mockChmod).toHaveBeenCalledWith("/tmp/swe-bench/task-xyz/eval.sh", 0o755);
    });

    it('should handle evaluation errors', async () => {
      const mockExecResult = {
        stdout: "",
        stderr: "Script failed",
        exitCode: 1
      };
      mockExecInContainer.mockReturnValue(Effect.succeed(mockExecResult));
      mockCopyFromContainer.mockReturnValue(Effect.fail(new DockerOperationError({ 
        message: "File not found", 
        operation: "copyFromContainer",
        containerId: "container-123"
      })));

      const program = Effect.gen(function* () {
        const service = yield* SWEBenchLifecycleService;
        return yield* service.runEvaluationInContainer(
          mockContext,
          "#!/bin/bash\nexit 1",
          "patch content"
        );
      }).pipe(
        Effect.provide(testLayer),
        Effect.provide(Layer.succeed(FileSystem, createMockFileSystem()))
      );

      const result = await Effect.runPromiseExit(program);

      expect(Exit.isFailure(result)).toBe(true);
      if (Exit.isFailure(result) && result.cause._tag === 'Fail') {
        expect(result.cause.error).toBeInstanceOf(LifecycleEvalError);
      }
    });
  });

  describe('cleanupContainerResources', () => {
    const mockContext: ContainerContext = {
      containerId: "container-123",
      hostEvalDir: "/tmp/swe-bench/task-xyz",
      containerEvalDir: "/swe_bench_workdir/test-task-1",
      containerRepoPath: "/swe_bench_workdir/test-task-1/test-repo",
    };

    it('should cleanup resources successfully', async () => {
      const program = Effect.gen(function* () {
        const service = yield* SWEBenchLifecycleService;
        return yield* service.cleanupContainerResources(mockContext);
      }).pipe(
        Effect.provide(testLayer),
        Effect.provide(Layer.succeed(FileSystem, createMockFileSystem()))
      );

      const result = await Effect.runPromiseExit(program);

      expect(Exit.isSuccess(result)).toBe(true);
      expect(mockStopContainer).toHaveBeenCalledWith("container-123", { t: 10 });
      expect(mockRemoveContainer).toHaveBeenCalledWith("container-123", { force: true });
      expect(mockRemove).toHaveBeenCalledWith("/tmp/swe-bench/task-xyz", { recursive: true });
    });

    it('should handle cleanup errors gracefully', async () => {
      // Reset the mock to return an error
      mockStopContainer.mockReturnValue(
        Effect.fail(new DockerOperationError({ 
          message: "Container not running",
          operation: "stopContainer",
          containerId: "container-123"
        }))
      );

      const program = Effect.gen(function* () {
        const service = yield* SWEBenchLifecycleService;
        return yield* service.cleanupContainerResources(mockContext);
      }).pipe(
        Effect.provide(testLayer),
        Effect.provide(Layer.succeed(FileSystem, createMockFileSystem()))
      );

      const result = await Effect.runPromiseExit(program);

      // Should still succeed even if stop fails
      expect(Exit.isSuccess(result)).toBe(true);
      expect(mockRemoveContainer).toHaveBeenCalled();
      expect(mockRemove).toHaveBeenCalled();
    });
  });
});