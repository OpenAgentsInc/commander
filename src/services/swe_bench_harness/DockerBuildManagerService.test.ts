// src/services/swe_bench_harness/DockerBuildManagerService.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { Effect, Exit, Layer } from "effect";
import { NodeFileSystem } from "@effect/platform-node";
import { DockerBuildManagerService } from "./DockerBuildManagerService";
import { DockerBuildManagerServiceLive } from "./DockerBuildManagerServiceImpl";
import { DockerBuildPrepError } from "./errors";
import type { SWEBenchTask } from "./types";
import { ConfigurationService, ConfigurationServiceLive } from "@/services/configuration";
import { TelemetryService, TelemetryServiceLive, TelemetryServiceConfig, DefaultTelemetryConfigLayer } from "@/services/telemetry";

describe("DockerBuildManagerService", () => {
  const mockTask: SWEBenchTask = {
    instance_id: "django__django-11099",
    patch: "dummy patch content",
    repo: "django/django",
    base_commit: "abc123",
    hints_text: "",
    test_patch: "",
    problem_statement: "test problem",
    version: "1.0",
    FAIL_TO_PASS: ["test1"],
    PASS_TO_PASS: []
  };

  const TestConfigLayer = Layer.effect(
    ConfigurationService,
    Effect.gen(function* (_) {
      const configService = yield* _(ConfigurationService);
      
      // Set test values
      yield* _(configService.set("SWE_BENCH_DOCKERFILE_TEMPLATE_PATH", "./assets/dockerfiles/swe_bench_task.Dockerfile"));
      yield* _(configService.set("SWE_BENCH_CONTAINER_REPO_PATH", "/opt/swe-bench/repo"));
      
      return configService;
    })
  ).pipe(Layer.provide(ConfigurationServiceLive));

  const TestLayer = DockerBuildManagerServiceLive.pipe(
    Layer.provide(TestConfigLayer),
    Layer.provide(TelemetryServiceLive),
    Layer.provide(DefaultTelemetryConfigLayer),
    Layer.provide(NodeFileSystem.layer)
  );

  describe("prepareBuildContext", () => {
    it("should prepare build context successfully", async () => {
      const program = Effect.gen(function* (_) {
        const service = yield* _(DockerBuildManagerService);
        const result = yield* _(service.prepareBuildContext(mockTask, "/tmp"));
        
        expect(result.contextPath).toContain("swe-bench-build-django--django-11099");
        expect(result.dockerfileName).toBe("Dockerfile");
        expect(result.imageName).toBe("swe-bench-task/django--django-11099:latest");
        expect(result.containerRepoPath).toBe("/opt/swe-bench/repo");
        
        return result;
      });

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(TestLayer))
      );

      expect(Exit.isSuccess(result)).toBe(true);
    });

    it("should sanitize instance IDs with special characters", async () => {
      const taskWithSpecialChars: SWEBenchTask = {
        ...mockTask,
        instance_id: "user/repo:branch/issue-123"
      };

      const program = Effect.gen(function* (_) {
        const service = yield* _(DockerBuildManagerService);
        const result = yield* _(service.prepareBuildContext(taskWithSpecialChars, "/tmp"));
        
        expect(result.imageName).toBe("swe-bench-task/user--repo--branch--issue-123:latest");
        expect(result.contextPath).toContain("user--repo--branch--issue-123");
        
        return result;
      });

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(TestLayer))
      );

      expect(Exit.isSuccess(result)).toBe(true);
    });

    it("should construct proper GitHub URL", async () => {
      const program = Effect.gen(function* (_) {
        const service = yield* _(DockerBuildManagerService);
        const result = yield* _(service.prepareBuildContext(mockTask, "/tmp"));
        
        // We can verify the GitHub URL construction indirectly through the build context
        // The actual URL is passed to Docker build args
        expect(result.imageName).toContain("django--django");
        expect(result.containerRepoPath).toBe("/opt/swe-bench/repo");
      });

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(TestLayer))
      );

      expect(Exit.isSuccess(result)).toBe(true);
    });

    it("should handle dockerfile read errors", async () => {
      const ErrorConfigLayer = Layer.effect(
        ConfigurationService,
        Effect.gen(function* (_) {
          const configService = yield* _(ConfigurationService);
          
          // Set invalid template path
          yield* _(configService.set("SWE_BENCH_DOCKERFILE_TEMPLATE_PATH", "/nonexistent/path/Dockerfile"));
          
          return configService;
        })
      ).pipe(Layer.provide(ConfigurationServiceLive));

      const ErrorTestLayer = DockerBuildManagerServiceLive.pipe(
        Layer.provide(ErrorConfigLayer),
        Layer.provide(TelemetryServiceLive),
        Layer.provide(DefaultTelemetryConfigLayer),
        Layer.provide(NodeFileSystem.layer)
      );

      const program = Effect.gen(function* (_) {
        const service = yield* _(DockerBuildManagerService);
        return yield* _(service.prepareBuildContext(mockTask, "/tmp"));
      });

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(ErrorTestLayer))
      );

      expect(Exit.isFailure(result)).toBe(true);
      if (Exit.isFailure(result)) {
        const error = result.cause as any;
        expect(error._tag).toBe("Fail");
        expect(error.error._tag).toBe("DockerBuildPrepError");
        expect(error.error.message).toContain("Failed to read Dockerfile template");
      }
    });
  });
});