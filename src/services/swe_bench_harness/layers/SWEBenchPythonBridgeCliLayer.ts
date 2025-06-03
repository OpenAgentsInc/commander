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
import { SWEBenchEnvironmentSetupServiceTestImpl } from "../SWEBenchEnvironmentSetupServiceTestImpl";
import { SWEBenchEvaluationScriptServiceLive } from "../SWEBenchEvaluationScriptServiceImpl";
import { SWEBenchLifecycleServiceLive } from "../SWEBenchLifecycleServiceImpl";
import { SWEBenchHarnessServiceLive } from "../SWEBenchHarnessServiceImpl";
import { DockerUtilsServiceLive } from "@/services/docker";
import { SWEBenchPythonBridgeServiceLive } from "../SWEBenchPythonBridgeServiceImpl";

/**
 * Specialized layer for when USE_OFFICIAL_SWEBENCH=true
 * Uses the Python bridge to integrate with official SWE-bench
 * Provides test implementations for services that aren't actually used
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

// Docker service
const DockerWithDepsLayer = DockerUtilsServiceLive.pipe(
  Layer.provide(BaseServicesLayer)
);

// AI orchestration for patch generation
const AiOrchestrationLayer = ChatOrchestratorServiceCliLive.pipe(
  Layer.provide(BaseServicesLayer)
);

// SWE-bench task service
const TaskServiceLayer = SWEBenchTaskServiceLive.pipe(
  Layer.provide(BaseServicesLayer)
);

// Environment setup service (test implementation since not used with Python bridge)
const EnvironmentSetupLayer = SWEBenchEnvironmentSetupServiceTestImpl;

// Evaluation script service
const EvaluationScriptLayer = SWEBenchEvaluationScriptServiceLive.pipe(
  Layer.provide(BaseServicesLayer)
);

// Docker build manager
const DockerBuildManagerLayer = DockerBuildManagerServiceLive.pipe(
  Layer.provide(EnvironmentSetupLayer),
  Layer.provide(DockerWithDepsLayer),
  Layer.provide(BaseServicesLayer)
);

// Agent patch generator
const AgentPatchGeneratorLayer = AgentPatchGeneratorServiceLive.pipe(
  Layer.provide(AiOrchestrationLayer),
  Layer.provide(BaseServicesLayer)
);

// Python bridge service
const PythonBridgeLayer = SWEBenchPythonBridgeServiceLive.pipe(
  Layer.provide(BaseServicesLayer)
);

// Lifecycle service
const LifecycleServiceLayer = SWEBenchLifecycleServiceLive.pipe(
  Layer.provide(DockerBuildManagerLayer),
  Layer.provide(DockerWithDepsLayer),
  Layer.provide(BaseServicesLayer)
);

// Harness service with all dependencies
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
 * Complete CLI layer for Python bridge mode
 * Includes all services with test implementations where appropriate
 */
export const SWEBenchPythonBridgeCliLayer = Layer.mergeAll(
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