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
import { SWEBenchPythonBridgeServiceLive } from "../SWEBenchPythonBridgeServiceImpl";

/**
 * Layer composition for SWE-bench CLI
 * 
 * Dependencies flow:
 * 1. Base services (Config, Telemetry, Spark, FileSystem)
 * 2. Docker services
 * 3. AI orchestration services  
 * 4. SWE-bench core services (Task, Environment)
 * 5. SWE-bench composite services (BuildManager, Lifecycle)
 * 6. Top-level harness service
 */

// Base configuration and telemetry
const TelemetryWithConfigLayer = TelemetryServiceLive.pipe(
  Layer.provide(TelemetryServiceCliConfigLayer)
);

// Spark service with its dependencies
const SparkWithDepsLayer = SparkServiceTestLive.pipe(
  Layer.provide(DefaultSparkServiceConfigLayer),
  Layer.provide(TelemetryWithConfigLayer)
);

// All base services merged
const BaseServicesLayer = Layer.mergeAll(
  ConfigurationServiceEnvLive,
  TelemetryWithConfigLayer,
  SparkWithDepsLayer,
  NodeFileSystem.layer
);

// Docker service with base dependencies
const DockerWithDepsLayer = DockerUtilsServiceLive.pipe(
  Layer.provide(BaseServicesLayer)
);

// AI orchestration with all its dependencies
const AiOrchestrationLayer = ChatOrchestratorServiceCliLive.pipe(
  Layer.provide(BaseServicesLayer)
);

// SWE-bench task service (standalone, no SWE-bench dependencies)
const TaskServiceLayer = SWEBenchTaskServiceLive.pipe(
  Layer.provide(BaseServicesLayer)
);

// Environment setup service (only depends on base services)
const EnvironmentSetupLayer = SWEBenchEnvironmentSetupServiceLive.pipe(
  Layer.provide(BaseServicesLayer)
);

// Evaluation script service (only depends on base services)
const EvaluationScriptLayer = SWEBenchEvaluationScriptServiceLive.pipe(
  Layer.provide(BaseServicesLayer)
);

// Docker build manager (depends on environment setup)
const DockerBuildManagerLayer = DockerBuildManagerServiceLive.pipe(
  Layer.provide(EnvironmentSetupLayer),
  Layer.provide(DockerWithDepsLayer),
  Layer.provide(BaseServicesLayer)
);

// Agent patch generator (depends on AI orchestration)
const AgentPatchGeneratorLayer = AgentPatchGeneratorServiceLive.pipe(
  Layer.provide(AiOrchestrationLayer),
  Layer.provide(BaseServicesLayer)
);

// Python bridge service (only depends on base services)
const PythonBridgeLayer = SWEBenchPythonBridgeServiceLive.pipe(
  Layer.provide(BaseServicesLayer)
);

// Lifecycle service (depends on docker build manager)
const LifecycleServiceLayer = SWEBenchLifecycleServiceLive.pipe(
  Layer.provide(DockerBuildManagerLayer),
  Layer.provide(DockerWithDepsLayer),
  Layer.provide(BaseServicesLayer)
);

// Harness service (depends on everything)
const HarnessServiceLayer = SWEBenchHarnessServiceLive.pipe(
  Layer.provide(Layer.mergeAll(
    TaskServiceLayer,
    AgentPatchGeneratorLayer,
    LifecycleServiceLayer,
    DockerBuildManagerLayer,
    EnvironmentSetupLayer,
    EvaluationScriptLayer,
    PythonBridgeLayer
  )),
  Layer.provide(DockerWithDepsLayer),
  Layer.provide(BaseServicesLayer)
);

/**
 * Complete CLI layer for SWE-bench evaluation
 * Includes all services properly composed with dependencies
 */
export const SWEBenchCliLayer = Layer.mergeAll(
  HarnessServiceLayer,
  LifecycleServiceLayer,
  DockerBuildManagerLayer,
  AgentPatchGeneratorLayer,
  EvaluationScriptLayer,
  EnvironmentSetupLayer,
  TaskServiceLayer,
  PythonBridgeLayer,
  DockerWithDepsLayer,
  AiOrchestrationLayer,
  BaseServicesLayer
);

/**
 * Minimal layer for just patch generation (no Docker required)
 * Used for testing and standalone patch generation
 */
export const PatchGenerationCliLayer = Layer.mergeAll(
  AgentPatchGeneratorLayer,
  TaskServiceLayer,
  AiOrchestrationLayer,
  BaseServicesLayer
);

// For backwards compatibility
export const CLISWEBenchHarnessLayer = SWEBenchCliLayer;