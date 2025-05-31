#!/usr/bin/env tsx

import { Effect, Layer, Logger, LogLevel, Runtime, Console, pipe } from "effect";
import { Command } from "commander";
import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";
import { 
  SWEBenchHarnessService,
  SWEBenchHarnessServiceImpl,
  SWEBenchTaskService,
  SWEBenchTaskServiceImpl,
  SWEBenchEvaluationScriptService,
  SWEBenchEvaluationScriptServiceImpl,
  SWEBenchLifecycleService,
  SWEBenchLifecycleServiceImpl,
  DockerBuildManagerService,
  DockerBuildManagerServiceImpl,
  type SWEBenchTask,
  type EvaluationResult
} from "../src/services/swe_bench_harness/index.js";
import { DockerUtilsService, DockerUtilsServiceImpl } from "../src/services/docker/index.js";
import { ConfigurationService, ConfigurationServiceImpl } from "../src/services/configuration/index.js";
import { DatabaseService, DatabaseServiceImpl } from "../src/services/db/index.js";
import { Schema } from "effect";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Command line interface
const program = new Command();

program
  .name("run-swebench-task")
  .description("Run SWE-bench evaluation tasks")
  .version("1.0.0")
  .requiredOption("-t, --task <path>", "Path to the task JSON file")
  .option("-p, --patch <path>", "Path to patch file to apply")
  .option("-c, --patch-content <content>", "Inline patch content")
  .option("--no-patch", "Run without applying any patch")
  .option("-o, --output <path>", "Output directory for results", "./swebench-results")
  .option("--keep-container", "Don't remove container after evaluation")
  .option("--timeout <minutes>", "Evaluation timeout in minutes", "30")
  .option("-v, --verbose", "Enable verbose logging")
  .parse(process.argv);

const options = program.opts();

// Validation
if (!options.patch && !options.patchContent && options.patch !== false) {
  console.error("Error: Must specify either --patch, --patch-content, or --no-patch");
  process.exit(1);
}

if (options.patch && options.patchContent) {
  console.error("Error: Cannot specify both --patch and --patch-content");
  process.exit(1);
}

// Load task data
async function loadTaskData(taskPath: string): Promise<SWEBenchTask> {
  try {
    const content = await fs.readFile(taskPath, "utf-8");
    const data = JSON.parse(content);
    return Schema.decodeSync(Schema.parseJson(Schema.Struct({
      instance_id: Schema.String,
      repo: Schema.String,
      base_commit: Schema.String,
      problem_statement: Schema.String,
      hints_text: Schema.optional(Schema.String),
      test_patch: Schema.String,
      version: Schema.String,
      FAIL_TO_PASS: Schema.Array(Schema.String),
      PASS_TO_PASS: Schema.Array(Schema.String),
      patch: Schema.optional(Schema.String),
    })))(content);
  } catch (error) {
    throw new Error(`Failed to load task data: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Load patch content
async function loadPatchContent(options: any): Promise<string | undefined> {
  if (options.patch === false) {
    return undefined;
  }
  
  if (options.patchContent) {
    return options.patchContent;
  }
  
  if (options.patch) {
    try {
      return await fs.readFile(options.patch, "utf-8");
    } catch (error) {
      throw new Error(`Failed to load patch file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  return undefined;
}

// Save results
async function saveResults(outputDir: string, task: SWEBenchTask, result: EvaluationResult, patchContent?: string) {
  const taskDir = path.join(outputDir, task.instance_id);
  await fs.mkdir(taskDir, { recursive: true });
  
  // Save evaluation report
  await fs.writeFile(
    path.join(taskDir, "evaluation_report.json"),
    JSON.stringify(result, null, 2)
  );
  
  // Save applied patch if provided
  if (patchContent) {
    await fs.writeFile(
      path.join(taskDir, "patch_applied.diff"),
      patchContent
    );
  }
  
  // Copy test output log if available
  if (result.report.test_output_log_path) {
    try {
      const logContent = await fs.readFile(result.report.test_output_log_path, "utf-8");
      await fs.writeFile(
        path.join(taskDir, "test_output.log"),
        logContent
      );
    } catch (error) {
      console.warn(`Warning: Could not copy test output log: ${error}`);
    }
  }
  
  // Save container logs
  if (result.container_logs) {
    await fs.writeFile(
      path.join(taskDir, "container_logs.txt"),
      `=== STDOUT ===\n${result.container_logs.stdout}\n\n=== STDERR ===\n${result.container_logs.stderr}`
    );
  }
  
  console.log(`\nResults saved to: ${taskDir}`);
}

// Main evaluation function
const runEvaluation = Effect.gen(function* () {
  const harnessService = yield* SWEBenchHarnessService;
  
  // Load task data
  const task = yield* Effect.tryPromise({
    try: () => loadTaskData(options.task),
    catch: (error) => new Error(`Failed to load task: ${error}`)
  });
  
  yield* Console.log(`\nLoaded task: ${task.instance_id}`);
  yield* Console.log(`Repository: ${task.repo}`);
  yield* Console.log(`Base commit: ${task.base_commit}`);
  yield* Console.log(`Tests to fix: ${task.FAIL_TO_PASS.join(", ")}`);
  
  // Load patch content
  const patchContent = yield* Effect.tryPromise({
    try: () => loadPatchContent(options),
    catch: (error) => new Error(`Failed to load patch: ${error}`)
  });
  
  if (patchContent) {
    yield* Console.log(`\nPatch loaded (${patchContent.split('\n').length} lines)`);
  } else {
    yield* Console.log("\nNo patch provided - running baseline evaluation");
  }
  
  // Run evaluation
  yield* Console.log("\nStarting evaluation...");
  const startTime = Date.now();
  
  const result = yield* harnessService.evaluateTask(
    task.instance_id,
    patchContent || ""
  );
  
  const duration = Date.now() - startTime;
  yield* Console.log(`\nEvaluation completed in ${(duration / 1000).toFixed(1)}s`);
  
  // Display results
  yield* Console.log("\n=== EVALUATION RESULTS ===");
  yield* Console.log(`Instance ID: ${result.instance_id}`);
  yield* Console.log(`Patch Applied: ${result.report.patch_applied_successfully ? "✓" : "✗"}`);
  yield* Console.log(`Tests Passed: ${result.report.tests_passed ? "✓" : "✗"}`);
  yield* Console.log(`Task Resolved: ${result.report.resolved ? "✓ SUCCESS" : "✗ FAILURE"}`);
  
  // Save results
  yield* Effect.tryPromise({
    try: () => saveResults(options.output, task, result, patchContent),
    catch: (error) => new Error(`Failed to save results: ${error}`)
  });
  
  return result;
});

// Create runtime with all required services
const createMainLayer = () => {
  // Set up logging based on verbosity
  const logLevel = options.verbose ? LogLevel.Debug : LogLevel.Info;
  
  return Layer.mergeAll(
    SWEBenchHarnessServiceImpl,
    SWEBenchTaskServiceImpl,
    SWEBenchEvaluationScriptServiceImpl,
    SWEBenchLifecycleServiceImpl,
    DockerBuildManagerServiceImpl,
    DockerUtilsServiceImpl,
    ConfigurationServiceImpl,
    DatabaseServiceImpl,
    Logger.minimumLogLevel(logLevel)
  );
};

// Run the evaluation
const main = async () => {
  console.log("SWE-bench Task Runner v1.0.0");
  console.log("============================");
  
  try {
    const runtime = Runtime.defaultRuntime.pipe(
      Runtime.updateContext(Layer.toContext(createMainLayer()))
    );
    
    const result = await Runtime.runPromise(runtime)(runEvaluation);
    
    if (result.report.resolved) {
      console.log("\n✓ Task successfully resolved!");
      process.exit(0);
    } else {
      console.log("\n✗ Task not resolved");
      process.exit(1);
    }
  } catch (error) {
    console.error("\nError during evaluation:", error);
    if (options.verbose && error instanceof Error && error.stack) {
      console.error("\nStack trace:", error.stack);
    }
    process.exit(2);
  }
};

// Handle container cleanup on exit
if (!options.keepContainer) {
  process.on("SIGINT", () => {
    console.log("\nReceived interrupt signal, cleaning up...");
    // Note: The harness service should handle cleanup automatically
    process.exit(130);
  });
}

// Run the main function
main();