import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Effect, Exit, Layer } from 'effect';
import { TelemetryService } from '@/services/telemetry';
import { SWEBenchEvaluationScriptService } from '@/services/swe_bench_harness/SWEBenchEvaluationScriptService';
import { SWEBenchEvaluationScriptServiceLive } from '@/services/swe_bench_harness/SWEBenchEvaluationScriptServiceImpl';
import { ScriptBuildError } from '@/services/swe_bench_harness/errors';
import type { SWEBenchTask } from '@/services/swe_bench_harness/types';

const mockTrackEvent = vi.fn(() => Effect.void);

const mockTelemetryService = TelemetryService.of({
  trackEvent: mockTrackEvent,
  isEnabled: () => Effect.succeed(true),
  setEnabled: () => Effect.void,
});

describe('SWEBenchEvaluationScriptService', () => {
  let testLayer: Layer.Layer<SWEBenchEvaluationScriptService, never, never>;

  beforeEach(() => {
    vi.clearAllMocks();
    testLayer = SWEBenchEvaluationScriptServiceLive.pipe(
      Layer.provide(Layer.succeed(TelemetryService, mockTelemetryService))
    );
  });

  describe('buildEvalScript', () => {
    const sampleTask: SWEBenchTask = {
      instance_id: "test-task-1",
      repo: "test/repo",
      base_commit: "abc123",
      problem_statement: "Fix the bug.",
      test_patch: "diff --git a/test.py b/test.py\n...",
      version: "1.0",
      FAIL_TO_PASS: ["test_case1", "test_case2"],
      PASS_TO_PASS: ["test_case3"],
    };

    it('should build a valid evaluation script', async () => {
      const program = Effect.gen(function* () {
        const service = yield* SWEBenchEvaluationScriptService;
        return yield* service.buildEvalScript(
          sampleTask,
          "patch.diff",
          "/container/eval",
          "/container/eval/repo"
        );
      });
      
      const result = await Effect.runPromiseExit(Effect.provide(program, testLayer));
      
      expect(Exit.isSuccess(result)).toBe(true);
      if (Exit.isSuccess(result)) {
        const script = result.value;
        expect(script).toContain('#!/bin/bash');
        expect(script).toContain('set -eo pipefail');
        expect(script).toContain('conda activate swe-bench');
        expect(script).toContain('cd "/container/eval/repo"');
        expect(script).toContain('git apply');
        expect(script).toContain('patch.diff');
        expect(script).toContain('python -m pytest test_case1 test_case2');
        expect(script).toContain('report.json');
        expect(script).toContain('test-task-1');
      }
    });

    it('should use placeholder test command when FAIL_TO_PASS is empty', async () => {
      const taskWithoutTests = { ...sampleTask, FAIL_TO_PASS: [] };
      
      const program = Effect.gen(function* () {
        const service = yield* SWEBenchEvaluationScriptService;
        return yield* service.buildEvalScript(
          taskWithoutTests,
          "patch.diff",
          "/container/eval",
          "/container/eval/repo"
        );
      });
      
      const result = await Effect.runPromiseExit(Effect.provide(program, testLayer));
      
      expect(Exit.isSuccess(result)).toBe(true);
      if (Exit.isSuccess(result)) {
        const script = result.value;
        expect(script).toContain('Test execution placeholder for test-task-1');
        expect(script).toContain('python -m pytest');
        expect(script).not.toContain('python -m pytest test_case1');
      }
    });

    it('should handle patch application with reverse try first', async () => {
      const program = Effect.gen(function* () {
        const service = yield* SWEBenchEvaluationScriptService;
        return yield* service.buildEvalScript(
          sampleTask,
          "fix.patch",
          "/eval",
          "/eval/myrepo"
        );
      });
      
      const result = await Effect.runPromiseExit(Effect.provide(program, testLayer));
      
      expect(Exit.isSuccess(result)).toBe(true);
      if (Exit.isSuccess(result)) {
        const script = result.value;
        expect(script).toContain('git apply -v --reverse /eval/fix.patch 2>/dev/null || git apply -v /eval/fix.patch');
      }
    });

    it('should generate proper JSON report structure', async () => {
      const program = Effect.gen(function* () {
        const service = yield* SWEBenchEvaluationScriptService;
        return yield* service.buildEvalScript(
          sampleTask,
          "patch.diff",
          "/container/eval",
          "/container/eval/repo"
        );
      });
      
      const result = await Effect.runPromiseExit(Effect.provide(program, testLayer));
      
      expect(Exit.isSuccess(result)).toBe(true);
      if (Exit.isSuccess(result)) {
        const script = result.value;
        expect(script).toContain('"instance_id": "test-task-1"');
        expect(script).toContain('"patch_applied_successfully": $PATCH_APPLIED_SUCCESSFULLY');
        expect(script).toContain('"tests_passed": $TESTS_PASSED');
        expect(script).toContain('"resolved": $([ "$PATCH_APPLIED_SUCCESSFULLY" = true ] && [ "$TESTS_PASSED" = true ]');
        expect(script).toContain('"test_output_path": "$TEST_OUTPUT_FILE"');
      }
    });

    it('should track telemetry event on script build', async () => {
      const program = Effect.gen(function* () {
        const service = yield* SWEBenchEvaluationScriptService;
        return yield* service.buildEvalScript(
          sampleTask,
          "patch.diff",
          "/container/eval",
          "/container/eval/repo"
        );
      });
      
      await Effect.runPromise(Effect.provide(program, testLayer));
      
      // Give time for the forked effect to run
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockTrackEvent).toHaveBeenCalledWith({
        category: "swe_bench",
        action: "eval_script_built",
        label: "test-task-1"
      });
    });

    it('should handle script build errors gracefully', async () => {
      const invalidTask = null as any; // This will cause an error
      
      const program = Effect.gen(function* () {
        const service = yield* SWEBenchEvaluationScriptService;
        return yield* service.buildEvalScript(
          invalidTask,
          "patch.diff",
          "/container/eval",
          "/container/eval/repo"
        );
      });
      
      const result = await Effect.runPromiseExit(Effect.provide(program, testLayer));
      
      expect(Exit.isFailure(result)).toBe(true);
      if (Exit.isFailure(result) && result.cause._tag === 'Fail') {
        expect(result.cause.error).toBeInstanceOf(ScriptBuildError);
        expect((result.cause.error as ScriptBuildError).message).toContain("Failed to build evaluation script");
      }
    });
  });
});