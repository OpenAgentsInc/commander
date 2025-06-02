import { Layer } from "effect";
import { NodeFileSystem } from "@effect/platform-node";
import { ConfigurationServiceEnvLive } from "@/services/configuration/ConfigurationServiceEnv";
import { TelemetryServiceLive } from "@/services/telemetry";
import { TelemetryServiceCliConfigLayer } from "@/services/telemetry/TelemetryServiceCliConfig";
import { SparkServiceTestLive, DefaultSparkServiceConfigLayer } from "@/services/spark";
import { ChatOrchestratorServiceCliLive } from "@/services/ai/orchestration";
import { AgentPatchGeneratorServiceLive } from "../AgentPatchGeneratorServiceImpl";
import { SWEBenchTaskServiceLive } from "../SWEBenchTaskServiceImpl";
import { DockerBuildManagerServiceLive } from "../DockerBuildManagerServiceImpl";
import { SWEBenchEnvironmentSetupServiceLive } from "../SWEBenchEnvironmentSetupServiceImpl";
import { SWEBenchEvaluationScriptServiceLive } from "../SWEBenchEvaluationScriptServiceImpl";
import { SWEBenchLifecycleServiceLive } from "../SWEBenchLifecycleServiceImpl";
import { SWEBenchHarnessServiceLive } from "../SWEBenchHarnessServiceImpl";
import { DockerUtilsServiceLive } from "@/services/docker";

/**
 * Telemetry service configured for CLI (without FileSystem dependency)
 */
const TelemetryServiceCliLayer = TelemetryServiceLive.pipe(
  Layer.provide(TelemetryServiceCliConfigLayer)
);

/**
 * Spark service with test implementation (avoids ECC library issues)
 * Must be created after TelemetryService is available
 */
const SparkServiceLayer = SparkServiceTestLive.pipe(
  Layer.provide(DefaultSparkServiceConfigLayer),
  Layer.provide(TelemetryServiceCliLayer)
);

/**
 * Platform services for Node.js CLI
 */
const PlatformServicesLayer = NodeFileSystem.layer;

/**
 * Base services needed for CLI execution
 */
const BaseCliServicesLayer = Layer.mergeAll(
  ConfigurationServiceEnvLive,
  TelemetryServiceCliLayer,
  SparkServiceLayer,
  PlatformServicesLayer
);

/**
 * Docker services layer
 */
const DockerServicesLayer = DockerUtilsServiceLive;

/**
 * AI orchestration layer for CLI
 * Uses simplified CLI orchestrator that only supports claude_code
 */
const AiOrchestrationCliLayer = ChatOrchestratorServiceCliLive.pipe(
  Layer.provide(BaseCliServicesLayer)
);

/**
 * SWE-bench specific services that depend on AI orchestration
 */
const SWEBenchServicesLayer = Layer.mergeAll(
  SWEBenchTaskServiceLive,
  DockerBuildManagerServiceLive,
  SWEBenchEnvironmentSetupServiceLive,
  SWEBenchEvaluationScriptServiceLive
).pipe(
  Layer.provide(DockerServicesLayer),
  Layer.provide(BaseCliServicesLayer)
);

/**
 * Agent patch generator with AI dependencies
 */
const PatchGeneratorLayer = AgentPatchGeneratorServiceLive.pipe(
  Layer.provide(AiOrchestrationCliLayer),
  Layer.provide(BaseCliServicesLayer)
);

/**
 * SWE-bench lifecycle service with all dependencies
 */
const LifecycleLayer = SWEBenchLifecycleServiceLive.pipe(
  Layer.provide(SWEBenchServicesLayer),
  Layer.provide(BaseCliServicesLayer)
);

/**
 * Complete SWE-bench harness with all services
 */
const HarnessLayer = SWEBenchHarnessServiceLive.pipe(
  Layer.provide(Layer.mergeAll(
    SWEBenchTaskServiceLive,
    PatchGeneratorLayer,
    LifecycleLayer,
    DockerBuildManagerServiceLive,
    SWEBenchEnvironmentSetupServiceLive,
    SWEBenchEvaluationScriptServiceLive
  )),
  Layer.provide(DockerServicesLayer),
  Layer.provide(BaseCliServicesLayer)
);

/**
 * Complete CLI layer for SWE-bench evaluation
 * This provides all services needed to run SWE-bench tasks with AI-generated patches
 */
export const SWEBenchCliLayer = HarnessLayer;

/**
 * Minimal layer for just patch generation (useful for testing)
 */
export const PatchGenerationCliLayer = Layer.mergeAll(
  PatchGeneratorLayer,
  SWEBenchTaskServiceLive
).pipe(
  Layer.provide(BaseCliServicesLayer)
);