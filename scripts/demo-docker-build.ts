#!/usr/bin/env tsx
/**
 * Simple demonstration of Docker image building functionality
 */

import { Effect, Layer } from "effect";
import { NodeFileSystem } from "@effect/platform-node";
import { NodeRuntime } from "@effect/platform-node";
import { DockerUtilsServiceLive } from "@/services/docker";
import { ConfigurationServiceLive } from "@/services/configuration";
import { TelemetryServiceLive, DefaultTelemetryConfigLayer } from "@/services/telemetry";
import { DockerBuildManagerService, DockerBuildManagerServiceLive } from "@/services/swe_bench_harness";
import type { SWEBenchTask } from "@/services/swe_bench_harness";

// Create a simple test task
const testTask: SWEBenchTask = {
  instance_id: "demo-task-001",
  repo: "octocat/Hello-World",
  base_commit: "553c2077ca",
  problem_statement: "Demo task",
  test_patch: "",
  version: "1.0",
  FAIL_TO_PASS: [],
  PASS_TO_PASS: [],
  patch: "",
  hints_text: ""
};

// Create the runtime layer
const RuntimeLayer = Layer.mergeAll(
  ConfigurationServiceLive,
  TelemetryServiceLive,
  DefaultTelemetryConfigLayer,
  DockerBuildManagerServiceLive,
  NodeFileSystem.layer
);

// Main demo program
const demoProgram = Effect.gen(function* () {
  const buildManager = yield* DockerBuildManagerService;
  
  console.log("🐳 Docker Build Manager Demo\n");
  
  // Prepare build context
  console.log("📦 Preparing build context for task:", testTask.instance_id);
  const buildContext = yield* buildManager.prepareBuildContext(testTask, "/tmp");
  
  console.log("\n✅ Build context prepared:");
  console.log("   Context Path:", buildContext.contextPath);
  console.log("   Dockerfile:", buildContext.dockerfileName);
  console.log("   Image Name:", buildContext.imageName);
  console.log("   Container Repo Path:", buildContext.containerRepoPath);
  
  console.log("\n📋 Build Arguments:");
  console.log("   REPO_URL_ARG:", `https://github.com/${testTask.repo}.git`);
  console.log("   BASE_COMMIT_ARG:", testTask.base_commit);
  console.log("   CONTAINER_REPO_PATH_ARG:", buildContext.containerRepoPath);
  
  console.log("\n🎉 Demo complete! The build context is ready for Docker image building.");
  console.log("   Next step would be to call docker.buildImage() with this context.");
  
  return buildContext;
});

// Run the demo
console.log("Starting Docker build manager demo...\n");

NodeRuntime.runMain(
  demoProgram.pipe(
    Effect.provide(RuntimeLayer),
    Effect.tapError(error => 
      Effect.sync(() => {
        console.error("\n❌ Error:", error);
      })
    )
  )
);