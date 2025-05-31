import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Effect, Exit, Layer, Ref } from 'effect';
import { FileSystem } from '@effect/platform-node';
import { ConfigurationService } from '@/services/configuration';
import { TelemetryService } from '@/services/telemetry';
import { SWEBenchTaskService } from '@/services/swe_bench_harness/SWEBenchTaskService';
import { SWEBenchTaskServiceLive } from '@/services/swe_bench_harness/SWEBenchTaskServiceImpl';
import { SWEBenchTaskSchema } from '@/services/swe_bench_harness/types';
import { TaskNotFoundError, DatasetAccessError } from '@/services/swe_bench_harness/errors';

const mockReadFileString = vi.fn();
const mockReadDirectory = vi.fn();
const mockTrackEvent = vi.fn(() => Effect.void);

// Create a mock FileSystem that matches the interface
const createMockFileSystem = () => ({
    readFileString: mockReadFileString,
    readDirectory: mockReadDirectory,
    exists: vi.fn(() => Effect.succeed(true)),
    writeFileString: vi.fn(() => Effect.succeed(undefined)),
    writeFile: vi.fn(() => Effect.succeed(undefined)),
    readFile: vi.fn(() => Effect.succeed(new Uint8Array())),
    remove: vi.fn(() => Effect.succeed(undefined)),
    removeAll: vi.fn(() => Effect.succeed(undefined)),
    copy: vi.fn(() => Effect.succeed(undefined)),
    copyAll: vi.fn(() => Effect.succeed(undefined)),
    makeDirectory: vi.fn(() => Effect.succeed(undefined)),
    makeTempDirectory: vi.fn(() => Effect.succeed("")),
    makeTempDirectoryScoped: vi.fn(() => Effect.succeed("")),
    makeTempFile: vi.fn(() => Effect.succeed("")),
    makeTempFileScoped: vi.fn(() => Effect.succeed("")),
    chmod: vi.fn(() => Effect.succeed(undefined)),
    chown: vi.fn(() => Effect.succeed(undefined)),
    open: vi.fn(() => Effect.succeed(null as any)),
    sink: vi.fn(() => null as any),
    stream: vi.fn(() => null as any),
    stat: vi.fn(() => Effect.succeed({} as any)),
    readLink: vi.fn(() => Effect.succeed("")),
    symlink: vi.fn(() => Effect.succeed(undefined)),
    truncate: vi.fn(() => Effect.succeed(undefined)),
    utimes: vi.fn(() => Effect.succeed(undefined)),
    watch: vi.fn(() => null as any),
} as any)

const mockConfigService = (datasetPath: string) => ConfigurationService.of({
    get: vi.fn((key: string) => {
        if (key === "SWE_BENCH_DATASET_PATH") return Effect.succeed(datasetPath);
        return Effect.fail({ _tag: "ConfigError" as const, message: `Unknown key: ${key}` });
    }),
    getSecret: vi.fn(() => Effect.fail({ _tag: "SecretNotFoundError" as const, message: "Not found", keyName: "" })),
    set: vi.fn(() => Effect.void),
    delete: vi.fn(() => Effect.void),
});

const mockTelemetryService = TelemetryService.of({
    trackEvent: mockTrackEvent,
    isEnabled: () => Effect.succeed(true),
    setEnabled: () => Effect.void,
});

describe('SWEBenchTaskService', () => {
    const testDatasetPath = "/test/dataset";
    let testLayer: Layer.Layer<SWEBenchTaskService, never, never>;

    beforeEach(() => {
        vi.clearAllMocks();
        const mockFileSystem = createMockFileSystem();
        testLayer = SWEBenchTaskServiceLive.pipe(
            Layer.provide(Layer.succeed(FileSystem, mockFileSystem)),
            Layer.provide(Layer.succeed(ConfigurationService, mockConfigService(testDatasetPath))),
            Layer.provide(Layer.succeed(TelemetryService, mockTelemetryService))
        );
    });

    describe('getTask', () => {
        const sampleTaskData = {
            instance_id: "test-task-1",
            repo: "test/repo",
            base_commit: "abc123_base",
            problem_statement: "Fix the bug.",
            test_patch: "diff --git a/test.py b/test.py\n...",
            version: "1.0",
            FAIL_TO_PASS: ["test_case1"],
            PASS_TO_PASS: ["test_case2"],
        };

        it('should load, parse, and validate a task successfully', async () => {
            mockReadFileString.mockReturnValue(Effect.succeed(JSON.stringify(sampleTaskData)));

            const program = Effect.flatMap(SWEBenchTaskService, s => s.getTask("test-task-1"));
            const result = await Effect.runPromiseExit(Effect.provide(program, testLayer));

            expect(Exit.isSuccess(result)).toBe(true);
            if (Exit.isSuccess(result)) {
                expect(result.value).toEqual(sampleTaskData);
            }
            expect(mockReadFileString).toHaveBeenCalledWith(
                expect.stringContaining("/test/dataset/test-task-1.json"),
                "utf-8"
            );
        });

        it('should return TaskNotFoundError if task file does not exist', async () => {
            mockReadFileString.mockReturnValue(Effect.fail(new Error("File not found error"))); // Simulate fs error

            const program = Effect.flatMap(SWEBenchTaskService, s => s.getTask("nonexistent-task"));
            const result = await Effect.runPromiseExit(Effect.provide(program, testLayer));

            expect(Exit.isFailure(result)).toBe(true);
            if (Exit.isFailure(result) && result.cause._tag === 'Fail') {
                expect(result.cause.error).toBeInstanceOf(TaskNotFoundError);
                expect((result.cause.error as TaskNotFoundError).instanceId).toBe("nonexistent-task");
            }
        });

        it('should return DatasetAccessError if JSON is invalid', async () => {
            mockReadFileString.mockReturnValue(Effect.succeed("invalid json"));

            const program = Effect.flatMap(SWEBenchTaskService, s => s.getTask("invalid-json-task"));
            const result = await Effect.runPromiseExit(Effect.provide(program, testLayer));

            expect(Exit.isFailure(result)).toBe(true);
            if (Exit.isFailure(result) && result.cause._tag === 'Fail') {
                expect(result.cause.error).toBeInstanceOf(DatasetAccessError);
                expect((result.cause.error as DatasetAccessError).message).toContain("Failed to parse JSON");
            }
        });

        it('should return DatasetAccessError if task data schema is invalid', async () => {
            const invalidTaskData = { ...sampleTaskData, repo: undefined }; // Missing required 'repo'
            mockReadFileString.mockReturnValue(Effect.succeed(JSON.stringify(invalidTaskData)));

            const program = Effect.flatMap(SWEBenchTaskService, s => s.getTask("invalid-schema-task"));
            const result = await Effect.runPromiseExit(Effect.provide(program, testLayer));

            expect(Exit.isFailure(result)).toBe(true);
            if (Exit.isFailure(result) && result.cause._tag === 'Fail') {
                expect(result.cause.error).toBeInstanceOf(DatasetAccessError);
                expect((result.cause.error as DatasetAccessError).message).toContain("Invalid task data schema");
            }
        });

        it('should cache tasks after first load', async () => {
            mockReadFileString.mockReturnValue(Effect.succeed(JSON.stringify(sampleTaskData)));

            const program = Effect.gen(function*(_){
                const service = yield* _(SWEBenchTaskService);
                yield* _(service.getTask("test-task-1")); // First call
                return yield* _(service.getTask("test-task-1")); // Second call
            });
            await Effect.runPromise(Effect.provide(program, testLayer));

            expect(mockReadFileString).toHaveBeenCalledTimes(1); // Should only be called once
        });
    });

    describe('listAvailableTaskIds', () => {
        it('should list available task IDs successfully', async () => {
            mockReadDirectory.mockReturnValue(Effect.succeed(["task1.json", "task2.json", "task3.txt"]));

            const program = Effect.flatMap(SWEBenchTaskService, s => s.listAvailableTaskIds());
            const result = await Effect.runPromiseExit(Effect.provide(program, testLayer));

            expect(Exit.isSuccess(result)).toBe(true);
            if (Exit.isSuccess(result)) {
                expect(result.value).toEqual(["task1", "task2"]);
            }
            expect(mockReadDirectory).toHaveBeenCalledWith(testDatasetPath);
        });

        it('should handle empty directory', async () => {
            mockReadDirectory.mockReturnValue(Effect.succeed([]));

            const program = Effect.flatMap(SWEBenchTaskService, s => s.listAvailableTaskIds());
            const result = await Effect.runPromiseExit(Effect.provide(program, testLayer));

            expect(Exit.isSuccess(result)).toBe(true);
            if (Exit.isSuccess(result)) {
                expect(result.value).toEqual([]);
            }
        });

        it('should return DatasetAccessError if directory read fails', async () => {
            mockReadDirectory.mockReturnValue(Effect.fail(new Error("Directory read error")));

            const program = Effect.flatMap(SWEBenchTaskService, s => s.listAvailableTaskIds());
            const result = await Effect.runPromiseExit(Effect.provide(program, testLayer));

            expect(Exit.isFailure(result)).toBe(true);
            if (Exit.isFailure(result) && result.cause._tag === 'Fail') {
                expect(result.cause.error).toBeInstanceOf(DatasetAccessError);
                expect((result.cause.error as DatasetAccessError).message).toContain("Failed to read dataset directory");
            }
        });
    });
});