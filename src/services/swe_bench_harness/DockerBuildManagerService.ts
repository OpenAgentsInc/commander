// src/services/swe_bench_harness/DockerBuildManagerService.ts
import { Context, Effect } from "effect";
import type { SWEBenchTask } from "./types";
import { DockerBuildPrepError } from "./errors";
import type { ConfigError } from "@/services/configuration";
import type { FileSystem } from "@effect/platform/FileSystem";

export interface BuildContextResult {
  readonly contextPath: string; // Path to the directory containing Dockerfile and context
  readonly dockerfileName: string; // Name of the Dockerfile within contextPath (e.g., "Dockerfile")
  readonly imageName: string; // Suggested image name:tag
  readonly containerRepoPath: string; // Path where repo will be inside the container
}

export interface DockerBuildManagerService {
  prepareBuildContext(
    task: SWEBenchTask,
    hostWorkspaceRoot: string // Root for temp build contexts
  ): Effect.Effect<BuildContextResult, DockerBuildPrepError | ConfigError>;
}

export const DockerBuildManagerService =
  Context.GenericTag<DockerBuildManagerService>("DockerBuildManagerService");