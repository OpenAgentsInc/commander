import { Context, Effect } from "effect";
import type { SWEBenchTask, EvaluationReport, ContainerContext } from "./types";
import type { LifecycleSetupError, LifecycleEvalError } from "./errors";
import type { DockerError, DockerOperationError } from "@/services/docker";
import type { ConfigError } from "@/services/configuration";
import type { FileSystem } from "@effect/platform/FileSystem";

export interface SWEBenchLifecycleService {
  /**
   * Set up a Docker container for running a SWE-Bench task.
   * Creates temp directory, clones repo, creates and starts container.
   */
  setupContainerForTask(
    task: SWEBenchTask
  ): Effect.Effect<ContainerContext, LifecycleSetupError | DockerError | DockerOperationError | ConfigError, FileSystem>;

  /**
   * Run the evaluation script inside the container.
   * Writes patch and eval script, executes it, and retrieves results.
   */
  runEvaluationInContainer(
    containerContext: ContainerContext,
    evalScriptContent: string,
    patchContent: string,
    patchFileNameInContainer?: string // Default: "patch.diff"
  ): Effect.Effect<EvaluationReport, LifecycleEvalError | DockerOperationError | DockerError, FileSystem>;

  /**
   * Clean up container and temporary files.
   * Stops and removes container, deletes temp directory.
   */
  cleanupContainerResources(
    containerContext: ContainerContext
  ): Effect.Effect<void, DockerError | DockerOperationError, FileSystem>;
}

export const SWEBenchLifecycleService = Context.GenericTag<SWEBenchLifecycleService>("SWEBenchLifecycleService");