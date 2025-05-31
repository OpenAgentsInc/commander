#!/usr/bin/env tsx
/**
 * Docker Integration Test Script
 * 
 * This script tests the DockerUtilsService with a real Docker daemon.
 * Run with: pnpm tsx src/services/docker/test-docker-integration.ts
 * 
 * Prerequisites:
 * - Docker must be installed and running
 * - The test image (hello-world) will be pulled if not present
 */

import { Effect, Exit, Layer, Console } from "effect";
import { DockerUtilsService } from "./DockerUtilsService";
import { DockerUtilsServiceLive } from "./DockerUtilsServiceImpl";
import { ConfigurationService, ConfigurationServiceLive } from "@/services/configuration";

// Create a minimal config layer for testing
const TestConfigLayer = Layer.succeed(
  ConfigurationService,
  ConfigurationService.of({
    get: () => Effect.fail({ _tag: "ConfigError" as const, message: "Not implemented" }),
    getSecret: () => Effect.fail({ _tag: "SecretNotFoundError" as const, message: "Not implemented", keyName: "" }),
    set: () => Effect.succeed(undefined),
    delete: () => Effect.succeed(undefined),
  })
);

const testProgram = Effect.gen(function* (_) {
  const docker = yield* _(DockerUtilsService);
  
  yield* _(Console.log("🐳 Docker Integration Test Starting..."));
  
  // Test 1: List containers
  yield* _(Console.log("\n📋 Test 1: Listing containers..."));
  const containers = yield* _(docker.listContainers({ all: true }));
  yield* _(Console.log(`Found ${containers.length} containers`));
  containers.slice(0, 3).forEach(c => {
    console.log(`  - ${c.Names?.[0] || 'unnamed'} (${c.Id.substring(0, 12)}) - ${c.State}`);
  });
  
  // Test 2: Pull an image (using a small test image)
  const testImage = "hello-world:latest";
  yield* _(Console.log(`\n📥 Test 2: Pulling image ${testImage}...`));
  
  let pullProgress = 0;
  yield* _(docker.pullImage(testImage, (event) => {
    if (event.status) {
      process.stdout.write(`\r  ${event.status} ${event.progress || ''}`);
      pullProgress++;
    }
  }));
  console.log(`\n  ✓ Image pulled successfully (${pullProgress} progress events)`);
  
  // Test 3: Create a container
  yield* _(Console.log("\n📦 Test 3: Creating container..."));
  const containerId = yield* _(docker.createContainer({
    Image: testImage,
    name: `test-container-${Date.now()}`,
    HostConfig: {
      AutoRemove: false, // Don't auto-remove so we can clean up manually
    }
  }));
  yield* _(Console.log(`  ✓ Container created: ${containerId.substring(0, 12)}`));
  
  // Test 4: Start the container
  yield* _(Console.log("\n▶️  Test 4: Starting container..."));
  yield* _(docker.startContainer(containerId));
  yield* _(Console.log("  ✓ Container started"));
  
  // Wait a moment for the hello-world container to finish
  yield* _(Effect.sleep("1 second"));
  
  // Test 5: Stop the container (it might already be stopped since hello-world exits quickly)
  yield* _(Console.log("\n⏹️  Test 5: Stopping container..."));
  yield* _(
    docker.stopContainer(containerId)
      .pipe(
        Effect.catchAll(() => 
          Console.log("  ℹ️  Container already stopped (hello-world exits quickly)")
        )
      )
  );
  
  // Test 6: Remove the container
  yield* _(Console.log("\n🗑️  Test 6: Removing container..."));
  yield* _(docker.removeContainer(containerId));
  yield* _(Console.log("  ✓ Container removed"));
  
  yield* _(Console.log("\n✅ All tests passed!"));
});

// Run the test program
const runTests = async () => {
  console.log("Starting Docker integration tests...");
  console.log("Make sure Docker is running!\n");
  
  const layer = DockerUtilsServiceLive.pipe(
    Layer.provide(TestConfigLayer)
  );
  
  const result = await Effect.runPromiseExit(
    testProgram.pipe(Effect.provide(layer))
  );
  
  if (Exit.isFailure(result)) {
    console.error("\n❌ Tests failed!");
    console.error("Error details:", result.cause);
    
    // Extract more detailed error information
    if (result.cause._tag === "Fail") {
      const error = result.cause.error;
      if (error && typeof error === "object" && "message" in error) {
        console.error("\nError message:", error.message);
        if ("cause" in error && error.cause) {
          console.error("Underlying cause:", error.cause);
        }
      }
    }
    
    console.error("\nTroubleshooting:");
    console.error("1. Is Docker installed? Run: docker --version");
    console.error("2. Is Docker running? Run: docker ps");
    console.error("3. On macOS, check if Docker Desktop is running");
    console.error("4. On Linux, check if docker daemon is running: sudo systemctl status docker");
    
    process.exit(1);
  } else {
    console.log("\n🎉 All integration tests completed successfully!");
    process.exit(0);
  }
};

// Handle errors
process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection:", error);
  process.exit(1);
});

// Run the tests
runTests().catch(console.error);