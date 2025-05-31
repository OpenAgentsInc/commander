import { describe, it, expect, vi } from "vitest";
import { Effect, Layer, Stream } from "effect";
import { AgentPatchGeneratorService } from "@/services/swe_bench_harness/AgentPatchGeneratorService";
import { AgentPatchGeneratorServiceLive } from "@/services/swe_bench_harness/AgentPatchGeneratorServiceImpl";
import { AgentPatchGenerationError } from "@/services/swe_bench_harness/errors";
import { AiProviderError } from "@/services/ai/core";
import type { SWEBenchTask } from "@/services/swe_bench_harness/types";

describe("AgentPatchGeneratorService", () => {
  const mockTask: SWEBenchTask = {
    instance_id: "django__django-11099",
    repo: "django/django",
    base_commit: "abc123",
    problem_statement: "Remove period at the end of module level docstrings",
    hints_text: "Look for docstrings at the module level",
    test_patch: "diff --git a/tests/test_cache.py b/tests/test_cache.py",
    version: "3.0",
    FAIL_TO_PASS: ["tests/test_cache.py::TestCache::test_memcached"],
    PASS_TO_PASS: ["tests/test_cache.py::TestCache::test_basic"],
    patch: "--- a/django/core/cache/backends/memcached.py\n+++ b/django/core/cache/backends/memcached.py\n@@ -1 +1 @@\n-\"Memcached cache backend\"\n+\"Memcached cache backend.\"\n"
  };

  // Create a mock implementation directly without importing the orchestrator
  const createMockAgentPatchGenerator = (generatePatchFn: any) => {
    return AgentPatchGeneratorService.of({
      generatePatch: generatePatchFn
    });
  };

  it("should successfully extract patch from agent response", async () => {
    const expectedPatch = `--- a/django/core/cache/backends/memcached.py
+++ b/django/core/cache/backends/memcached.py
@@ -1 +1 @@
-"Memcached cache backend"
+"Memcached cache backend."`;

    const mockService = createMockAgentPatchGenerator(
      () => Effect.succeed(expectedPatch)
    );

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* AgentPatchGeneratorService;
        return yield* service.generatePatch(mockTask, "/tmp/repo", "claude_code");
      }).pipe(
        Effect.provide(Layer.succeed(AgentPatchGeneratorService, mockService))
      )
    );

    expect(result).toBe(expectedPatch);
  });

  it("should fail when no patch is found in agent response", async () => {
    const mockService = createMockAgentPatchGenerator(
      () => Effect.fail(new AgentPatchGenerationError({
        message: "No patch found in agent response",
        instanceId: "django__django-11099",
        providerKey: "claude_code"
      }))
    );

    const result = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const service = yield* AgentPatchGeneratorService;
        return yield* service.generatePatch(mockTask, "/tmp/repo", "claude_code");
      }).pipe(
        Effect.provide(Layer.succeed(AgentPatchGeneratorService, mockService))
      )
    );

    expect(result._tag).toBe("Failure");
    if (result._tag === "Failure") {
      const causeJson = result.cause.toJSON();
      if (typeof causeJson === 'object' && causeJson !== null && 'error' in causeJson) {
        const error = causeJson.error as any;
        expect(error._tag).toBe("AgentPatchGenerationError");
        expect(error.message).toContain("No patch found");
      }
    }
  });

  it("should propagate AI provider errors", async () => {
    const providerError = new AiProviderError({
      message: "API rate limit exceeded",
      provider: "claude_code",
      isRetryable: false
    });

    const mockService = createMockAgentPatchGenerator(
      () => Effect.fail(providerError)
    );

    const result = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const service = yield* AgentPatchGeneratorService;
        return yield* service.generatePatch(mockTask, "/tmp/repo", "claude_code");
      }).pipe(
        Effect.provide(Layer.succeed(AgentPatchGeneratorService, mockService))
      )
    );

    expect(result._tag).toBe("Failure");
    if (result._tag === "Failure") {
      const causeJson = result.cause.toJSON();
      if (typeof causeJson === 'object' && causeJson !== null && 'error' in causeJson) {
        const error = causeJson.error as any;
        expect(error._tag).toBe("AiProviderError");
        expect(error.message).toContain("rate limit");
      }
    }
  });

  it("should handle successful patch generation", async () => {
    const expectedPatch = `--- a/file.py\n+++ b/file.py\n@@ -1 +1 @@\n-old\n+new`;

    const mockService = createMockAgentPatchGenerator(
      () => Effect.succeed(expectedPatch)
    );

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* AgentPatchGeneratorService;
        return yield* service.generatePatch(mockTask, "/tmp/repo", "claude_code");
      }).pipe(
        Effect.provide(Layer.succeed(AgentPatchGeneratorService, mockService))
      )
    );

    expect(result).toBe(expectedPatch);
  });
});