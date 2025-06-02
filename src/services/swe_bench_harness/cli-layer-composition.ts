// src/services/swe_bench_harness/cli-layer-composition.ts
/**
 * CLI-specific layer composition for SWE-Bench harness.
 * This avoids browser-specific imports and provides appropriate implementations for CLI context.
 */

import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Context from "effect/Context";
import { pipe } from "effect/Function";

// Import platform-node for CLI context
import { NodeHttpClient, NodeFileSystem, NodePath } from "@effect/platform-node";
import { HttpClient, FileSystem, Path } from "@effect/platform";

// Import services
import {
  TelemetryService,
} from "@/services/telemetry";

import {
  ConfigurationService,
} from "@/services/configuration";

import {
  DockerUtilsService,
  DockerUtilsServiceLive,
} from "@/services/docker";

import {
  DatabaseService,
} from "@/services/db";

// Import SWE-Bench services
import {
  SWEBenchTaskService,
  SWEBenchTaskServiceLive,
} from "./SWEBenchTaskService";

import {
  SWEBenchEnvironmentSetupService,
  SWEBenchEnvironmentSetupServiceLive,
} from "./SWEBenchEnvironmentSetupService";

import {
  SWEBenchEvaluationScriptService,
  SWEBenchEvaluationScriptServiceLive,
} from "./SWEBenchEvaluationScriptService";

import {
  AgentPatchGeneratorService,
  AgentPatchGeneratorServiceLive,
} from "./AgentPatchGeneratorService";

import {
  DockerBuildManagerService,
  DockerBuildManagerServiceLive,
} from "./DockerBuildManagerService";

import {
  SWEBenchLifecycleService,
  SWEBenchLifecycleServiceLive,
} from "./SWEBenchLifecycleService";

import {
  SWEBenchHarnessService,
  SWEBenchHarnessServiceLive,
} from "./SWEBenchHarnessService";

// Create a simple console telemetry service for CLI
const CLITelemetryServiceLive = Layer.succeed(
  TelemetryService,
  TelemetryService.of({
    logEvent: (name: string, properties?: Record<string, any>) => 
      Effect.sync(() => {
        console.log(`[Telemetry] ${name}`, properties || {});
      }),
      
    logTiming: (name: string, durationMs: number, properties?: Record<string, any>) =>
      Effect.sync(() => {
        console.log(`[Telemetry] ${name} took ${durationMs}ms`, properties || {});
      }),
      
    logError: (name: string, error: unknown, properties?: Record<string, any>) =>
      Effect.sync(() => {
        console.error(`[Telemetry Error] ${name}`, error, properties || {});
      }),
      
    flush: () => Effect.sync(() => {}),
    
    trackEvent: (properties: Record<string, any>) =>
      Effect.sync(() => {
        console.log(`[Telemetry Event]`, properties);
      }),
  })
);

// Create a mock configuration service that reads from environment variables
const CLIConfigurationServiceLive = Layer.succeed(
  ConfigurationService,
  ConfigurationService.of({
    get: (key: string) => 
      Effect.sync(() => {
        const value = process.env[key];
        if (value === undefined) {
          throw new Error(`Configuration key ${key} not found`);
        }
        return value;
      }),
      
    getFeatureFlag: (key: string) =>
      Effect.sync(() => {
        const value = process.env[`FEATURE_${key}`];
        return value === "true";
      }),
      
    getFeatureFlagForUser: (userId: string, key: string) =>
      Effect.sync(() => {
        const value = process.env[`FEATURE_${key}`];
        return value === "true";
      }),
  })
);

// For CLI, we'll create a mock database service
const MockDatabaseServiceLive = Layer.succeed(
  DatabaseService,
  DatabaseService.of({
    getDatabase: () => Effect.sync(() => null as any),
    execute: () => Effect.sync(() => ({ rows: [], fields: [] })),
    transaction: (fn) => Effect.sync(() => fn({} as any)),
    query: () => Effect.sync(() => ({ rows: [], fields: [] })),
    sql: {} as any,
  })
);

// Build the full layer for CLI context
// Start with platform layers and build up incrementally
const platformLayers = Layer.mergeAll(
  NodeHttpClient.layerUndici,
  NodeFileSystem.layer,
  NodePath.layer,
);

const baseLayers = Layer.mergeAll(
  CLIConfigurationServiceLive,
  CLITelemetryServiceLive,
  MockDatabaseServiceLive,
);

// Docker layer with its dependencies
const dockerLayer = pipe(
  DockerUtilsServiceLive,
  Layer.provide(baseLayers),
);

// SWE-Bench task service with its dependencies
const taskServiceLayer = pipe(
  SWEBenchTaskServiceLive,
  Layer.provide(Layer.mergeAll(
    baseLayers,
    platformLayers,
  )),
);

// Environment setup service with its dependencies
const envSetupLayer = pipe(
  SWEBenchEnvironmentSetupServiceLive,
  Layer.provide(Layer.mergeAll(
    baseLayers,
    platformLayers,
    dockerLayer,
  )),
);

// Evaluation script service with its dependencies
const evalScriptLayer = pipe(
  SWEBenchEvaluationScriptServiceLive,
  Layer.provide(Layer.mergeAll(
    baseLayers,
    platformLayers,
  )),
);

// Agent patch generator with its dependencies
const agentPatchLayer = pipe(
  AgentPatchGeneratorServiceLive,
  Layer.provide(Layer.mergeAll(
    baseLayers,
    platformLayers,
    dockerLayer,
  )),
);

// Docker build manager with its dependencies
const dockerBuildLayer = pipe(
  DockerBuildManagerServiceLive,
  Layer.provide(Layer.mergeAll(
    baseLayers,
    platformLayers,
    dockerLayer,
  )),
);

// Lifecycle service with its dependencies
const lifecycleLayer = pipe(
  SWEBenchLifecycleServiceLive,
  Layer.provide(Layer.mergeAll(
    baseLayers,
    platformLayers,
    dockerLayer,
    envSetupLayer,
    evalScriptLayer,
    dockerBuildLayer,
  )),
);

// Finally, the harness service with all its dependencies
export const CLISWEBenchHarnessLayer = pipe(
  SWEBenchHarnessServiceLive,
  Layer.provide(Layer.mergeAll(
    baseLayers,
    platformLayers,
    dockerLayer,
    taskServiceLayer,
    envSetupLayer,
    evalScriptLayer,
    agentPatchLayer,
    dockerBuildLayer,
    lifecycleLayer,
  )),
);

// Export a helper function to run effects with the CLI layer
export const runWithCLILayer = <A, E>(effect: Effect.Effect<A, E, SWEBenchHarnessService>) =>
  Effect.runPromise(
    effect.pipe(
      Effect.provide(CLISWEBenchHarnessLayer)
    )
  );