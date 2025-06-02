#!/usr/bin/env tsx
/**
 * Debug service dependencies in detail
 */

import { Effect, Layer, Console, Context } from "effect";
import { SWEBenchEnvironmentSetupService } from "../src/services/swe_bench_harness/SWEBenchEnvironmentSetupService";
import { SWEBenchEnvironmentSetupServiceLive } from "../src/services/swe_bench_harness/SWEBenchEnvironmentSetupServiceImpl";
import { TelemetryService } from "../src/services/telemetry";
import { ConfigurationService } from "../src/services/configuration";

const program = Effect.gen(function* () {
  yield* Console.log("Testing SWEBenchEnvironmentSetupService dependencies...");
  
  // Try to access the services it depends on
  const telemetry = yield* TelemetryService;
  const config = yield* ConfigurationService;
  
  yield* Console.log("✅ Dependencies are available!");
  
  // Now try to access the environment setup service
  const envSetup = yield* SWEBenchEnvironmentSetupService;
  yield* Console.log("✅ SWEBenchEnvironmentSetupService is available!");
  
  return "success";
});

console.log("\n=== Testing Direct Service Access ===\n");

// First test with just the implementation layer
console.log("1. Testing with SWEBenchEnvironmentSetupServiceLive alone:");
Effect.runPromise(
  program.pipe(Effect.provide(SWEBenchEnvironmentSetupServiceLive))
)
  .then(() => console.log("   ✅ Works!"))
  .catch((error) => {
    console.log("   ❌ Failed:", error.message || error);
    if (error._tag === "NoSuchElementException") {
      console.log("   Missing service:", error.message);
    }
  });

// Now let's trace through the layer composition in SWEBenchCliLayer
console.log("\n2. Analyzing layer composition:");

import { SWEBenchCliLayer } from "../src/services/swe_bench_harness/layers/SWEBenchCliLayer";

// Try with the full CLI layer
setTimeout(() => {
  console.log("\n3. Testing with SWEBenchCliLayer:");
  Effect.runPromise(
    program.pipe(Effect.provide(SWEBenchCliLayer))
  )
    .then(() => console.log("   ✅ Works!"))
    .catch((error) => {
      console.log("   ❌ Failed:", error.message || error);
      console.log("   Full error:", JSON.stringify(error, null, 2));
    });
}, 100);