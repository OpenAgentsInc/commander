import { Effect, Layer } from "effect";
import { SWEBenchEnvironmentSetupService, type EnvironmentSetupConfig } from "./SWEBenchEnvironmentSetupService";
import type { SWEBenchTask } from "./types";

// Test implementation that doesn't require external dependencies
export const SWEBenchEnvironmentSetupServiceTestImpl = Layer.succeed(
  SWEBenchEnvironmentSetupService,
  SWEBenchEnvironmentSetupService.of({
    analyzeTaskEnvironment: (task) =>
      Effect.succeed({
        pythonVersion: "3.8",
        systemPackages: [],
        condaPackages: [],
        pipPackages: [],
        setupCommands: []
      }),

    generateSetupScript: (config, containerRepoPath, virtualEnvPath) =>
      Effect.succeed(`#!/bin/bash
set -eo pipefail
echo "Test environment setup script"
echo "Repository: ${containerRepoPath}"
echo "Virtual Environment: ${virtualEnvPath}"
echo "Python Version: ${config.pythonVersion}"
`),

    extractTestTargets: (testPatch) =>
      Effect.succeed([])
  })
);