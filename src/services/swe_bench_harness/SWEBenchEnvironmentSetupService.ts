import { Context, Effect } from "effect";
import type { SWEBenchTask } from "./types";

export interface EnvironmentSetupConfig {
  pythonVersion: string;
  systemPackages: string[];
  condaPackages: string[];
  pipPackages: string[];
  envYamlContent?: string;
  requirementsContent?: string;
  setupCommands: string[];
}

export interface SWEBenchEnvironmentSetupService {
  /**
   * Analyze a task and generate environment setup configuration
   */
  analyzeTaskEnvironment(
    task: SWEBenchTask
  ): Effect.Effect<EnvironmentSetupConfig, never>;

  /**
   * Generate a setup script for the environment
   */
  generateSetupScript(
    config: EnvironmentSetupConfig,
    containerRepoPath: string,
    virtualEnvPath: string
  ): Effect.Effect<string, never>;

  /**
   * Parse test patch to extract specific test targets
   */
  extractTestTargets(
    testPatch: string
  ): Effect.Effect<string[], never>;
}

export const SWEBenchEnvironmentSetupService = Context.GenericTag<SWEBenchEnvironmentSetupService>("SWEBenchEnvironmentSetupService");