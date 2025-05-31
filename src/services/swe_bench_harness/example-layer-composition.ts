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
  SWEBenchHarnessServiceLive,
  DockerBuildManagerServiceLive,
  SWEBenchEnvironmentSetupServiceLive
} from "@/services/swe_bench_harness";

// First provide the base ConfigurationService implementation
const ConfigLayer = DefaultDevConfigLayer.pipe(
  Layer.provide(ConfigurationServiceLive)
);

// Then provide TelemetryService with its config
const TelemetryLayer = TelemetryServiceLive.pipe(
  Layer.provide(DefaultTelemetryConfigLayer)
);

const BaseServicesLayer = Layer.mergeAll(
  ConfigLayer,
  TelemetryLayer,
  NodeFileSystem.layer,
  DockerUtilsServiceLive
);

export const FullSWEBenchHarnessLayer = SWEBenchHarnessServiceLive.pipe(
  Layer.provide(SWEBenchLifecycleServiceLive),
  Layer.provide(SWEBenchEvaluationScriptServiceLive),
  Layer.provide(SWEBenchTaskServiceLive),
  Layer.provide(DockerBuildManagerServiceLive),
  Layer.provide(SWEBenchEnvironmentSetupServiceLive),
  Layer.provide(BaseServicesLayer)
);