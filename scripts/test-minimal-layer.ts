#!/usr/bin/env tsx
/**
 * Minimal test to debug layer composition issues
 */

import { Effect, Layer } from "effect";
import { TelemetryService } from "@/services/telemetry";
import { TelemetryServiceLive, TelemetryServiceCliConfigLayer } from "@/services/telemetry";

const program = Effect.gen(function* () {
  const telemetry = yield* TelemetryService;
  
  console.log("✅ TelemetryService acquired successfully");
  
  // Try to track a simple event
  yield* telemetry.trackEvent({
    category: "test",
    action: "minimal_test",
    label: "layer_composition"
  });
  
  console.log("✅ Event tracked successfully");
});

// Create the layer without FileSystem
const testLayer = TelemetryServiceLive.pipe(
  Layer.provide(TelemetryServiceCliConfigLayer)
);

Effect.runPromise(
  program.pipe(
    Effect.provide(testLayer)
  )
).then(() => {
  console.log("✅ Test completed successfully");
  process.exit(0);
}).catch(error => {
  console.error("❌ Test failed:", error);
  process.exit(1);
});