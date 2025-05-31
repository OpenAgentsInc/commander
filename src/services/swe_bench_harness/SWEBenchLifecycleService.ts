import { Context, Effect } from "effect";
import type { SWEBenchTask, EvaluationReport, ContainerContext } from "./types";
import type { LifecycleSetupError, LifecycleEvalError, DockerBuildPrepError } from "./errors";
import type { DockerError, DockerOperationError } from "@/services/docker";
import type { ConfigError } from "@/services/configuration";
import type { FileSystem } from "@effect/platform/FileSystem";
import type { DockerBuildManagerService } from "./DockerBuildManagerService";

export interface SWEBenchLifecycleService {
  /**
   * Set up a Docker container for running a SWE-Bench task.
   * Builds custom Docker image, creates temp directory, creates and starts container.
   */
  setupContainerForTask(
    task: SWEBenchTask
  ): Effect.Effect<
    ContainerContext, 
    LifecycleSetupError | DockerError | DockerOperationError | ConfigError | DockerBuildPrepError
  >;

  /**
   * Run the evaluation script inside the container.
   * Writes patch and eval script, executes it, and retrieves results.
   */
  runEvaluationInContainer(
    containerContext: ContainerContext,
    evalScriptContent: string,
    patchContent: string,
    patchFileNameInContainer?: string, // Default: "patch.diff"
    testPatchContent?: string // Optional test patch content
  ): Effect.Effect<EvaluationReport, LifecycleEvalError | DockerOperationError | DockerError>;

  /**
   * Clean up container and temporary files.
   * Stops and removes container, deletes temp directory.
   */
  cleanupContainerResources(
    containerContext: ContainerContext
  ): Effect.Effect<void, DockerError | DockerOperationError>;
}

export const SWEBenchLifecycleService = Context.GenericTag<SWEBenchLifecycleService>("SWEBenchLifecycleService");