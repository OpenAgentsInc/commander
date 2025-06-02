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
 * Fixed layer composition that properly handles dependencies
 */

// Step 1: Base platform services
const PlatformLayer = NodeFileSystem.layer;

// Step 2: Configuration service
const ConfigLayer = ConfigurationServiceEnvLive;

// Step 3: Telemetry with its config
const TelemetryLayer = Layer.merge(
  TelemetryServiceCliConfigLayer,
  TelemetryServiceLive
);

// Step 4: Spark service with telemetry
const SparkLayer = Layer.merge(
  DefaultSparkServiceConfigLayer,
  Layer.merge(
    SparkServiceTestLive,
    TelemetryLayer
  )
);

// Step 5: All base services together
const BaseServicesLayer = Layer.mergeAll(
  PlatformLayer,
  ConfigLayer,
  TelemetryLayer,
  SparkLayer
);

// Step 6: Docker service
const DockerLayer = Layer.merge(
  DockerUtilsServiceLive,
  BaseServicesLayer
);

// Step 7: AI orchestration
const AiLayer = Layer.merge(
  ChatOrchestratorServiceCliLive,
  BaseServicesLayer
);

// Step 8: SWE-bench task service (no dependencies on other SWE-bench services)
const TaskLayer = Layer.merge(
  SWEBenchTaskServiceLive,
  BaseServicesLayer
);

// Step 9: Environment setup service (depends on base services)
const EnvSetupLayer = Layer.merge(
  SWEBenchEnvironmentSetupServiceLive,
  BaseServicesLayer
);

// Step 10: Docker build manager (depends on env setup)
const BuildManagerLayer = Layer.mergeAll(
  DockerBuildManagerServiceLive,
  EnvSetupLayer,
  DockerLayer,
  BaseServicesLayer
);

// Step 11: Evaluation script service
const EvalScriptLayer = Layer.merge(
  SWEBenchEvaluationScriptServiceLive,
  BaseServicesLayer
);

// Step 12: Agent patch generator (depends on AI)
const PatchGenLayer = Layer.mergeAll(
  AgentPatchGeneratorServiceLive,
  AiLayer,
  BaseServicesLayer
);

// Step 13: Lifecycle service (depends on docker build manager)
const LifecycleLayer = Layer.mergeAll(
  SWEBenchLifecycleServiceLive,
  BuildManagerLayer,
  DockerLayer,
  BaseServicesLayer
);

// Step 14: Complete harness (depends on everything)
export const SWEBenchCliLayerFixed = Layer.mergeAll(
  SWEBenchHarnessServiceLive,
  TaskLayer,
  PatchGenLayer,
  LifecycleLayer,
  BuildManagerLayer,
  EnvSetupLayer,
  EvalScriptLayer,
  DockerLayer,
  BaseServicesLayer
);

// Also export minimal patch generation layer
export const PatchGenerationOnlyLayer = Layer.mergeAll(
  TaskLayer,
  PatchGenLayer,
  BaseServicesLayer
);