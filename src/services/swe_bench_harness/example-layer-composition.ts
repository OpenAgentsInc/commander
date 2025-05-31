// Example of a full SWE-Bench Harness Layer composition
import { Layer } from "effect";
import { NodeFileSystem } from "@effect/platform-node"; // Ensure this is available if not already in base
import { ConfigurationServiceLive, DefaultDevConfigLayer } from "@/services/configuration"; // Or your specific config layer
import { TelemetryServiceLive, DefaultTelemetryConfigLayer } from "@/services/telemetry";   // Or your specific telemetry layer
import { DockerUtilsServiceLive } from "@/services/docker";
import {
  SWEBenchTaskServiceLive,
  SWEBenchEvaluationScriptServiceLive,
  SWEBenchLifecycleServiceLive,
  SWEBenchHarnessServiceLive
} from "@/services/swe_bench_harness";

const ConfigAndTelemetryBaseLayer = Layer.mergeAll(
  DefaultDevConfigLayer, // Provides ConfigurationService
  DefaultTelemetryConfigLayer // Provides TelemetryServiceConfigTag
).pipe(
  Layer.provide(TelemetryServiceLive) // Provides TelemetryService
);

export const FullSWEBenchHarnessLayer = SWEBenchHarnessServiceLive.pipe(
  Layer.provide(SWEBenchLifecycleServiceLive),
  Layer.provide(SWEBenchEvaluationScriptServiceLive),
  Layer.provide(SWEBenchTaskServiceLive),
  Layer.provide(DockerUtilsServiceLive),
  Layer.provide(NodeFileSystem.layer), // FileSystem needed by SWEBenchTaskServiceImpl and SWEBenchLifecycleServiceImpl
  Layer.provide(ConfigAndTelemetryBaseLayer) // Provides ConfigurationService and TelemetryService
);