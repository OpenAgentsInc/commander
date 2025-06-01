// Example of a full SWE-Bench Harness Layer composition
import { Layer } from "effect";
import { NodeFileSystem, NodeHttpClient } from "@effect/platform-node"; // Ensure this is available if not already in base
import { ConfigurationServiceLive, DefaultDevConfigLayer } from "@/services/configuration"; // Or your specific config layer
import { TelemetryServiceLive, DefaultTelemetryConfigLayer } from "@/services/telemetry";   // Or your specific telemetry layer
import { DockerUtilsServiceLive } from "@/services/docker";
import {
  SWEBenchTaskServiceLive,
  SWEBenchEvaluationScriptServiceLive,
  SWEBenchLifecycleServiceLive,
  SWEBenchHarnessServiceLive,
  DockerBuildManagerServiceLive,
  SWEBenchEnvironmentSetupServiceLive,
  AgentPatchGeneratorServiceLive
} from "@/services/swe_bench_harness";
import { ChatOrchestratorServiceLive } from "@/services/ai/orchestration";

// Import config layer dependencies
import { TelemetryServiceConfigFromConfigurationLayer } from "@/services/telemetry";

// First provide the base ConfigurationService implementation
const ConfigLayer = DefaultDevConfigLayer.pipe(
  Layer.provide(ConfigurationServiceLive)
);

// Provide FileSystem for telemetry
const FileSystemLayer = NodeFileSystem.layer;

// Create telemetry config layer that reads from configuration
const TelemetryConfigLayer = TelemetryServiceConfigFromConfigurationLayer.pipe(
  Layer.provide(ConfigLayer)
);

// Then provide TelemetryService with its config
const TelemetryLayer = TelemetryServiceLive.pipe(
  Layer.provide(Layer.merge(TelemetryConfigLayer, FileSystemLayer))
);

const BaseServicesLayer = Layer.mergeAll(
  ConfigLayer,
  TelemetryLayer,
  FileSystemLayer,
  NodeHttpClient.layerUndici,  // Add HttpClient for main process
  DockerUtilsServiceLive.pipe(Layer.provide(TelemetryLayer))
);

// Import the full runtime layer which has all dependencies including AI
import { buildFullAppLayer } from "@/services/runtime";

// For SWE-bench, use the full app layer which includes all AI services
const fullAppLayer = buildFullAppLayer();

// Build the complete layer stack from bottom to top
// Start with the full app layer as the base (has all core services)
export const FullSWEBenchHarnessLayer = Layer.mergeAll(
  // Core services that don't need AI
  SWEBenchTaskServiceLive,
  SWEBenchEvaluationScriptServiceLive,
  DockerBuildManagerServiceLive,
  SWEBenchEnvironmentSetupServiceLive,
  // AI-dependent services  
  AgentPatchGeneratorServiceLive,
  // Lifecycle service depends on other SWE-bench services
  SWEBenchLifecycleServiceLive,
  // Harness service depends on everything
  SWEBenchHarnessServiceLive
).pipe(
  // Provide the full app layer which has all dependencies
  Layer.provide(fullAppLayer)
);