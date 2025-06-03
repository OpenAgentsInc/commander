#!/usr/bin/env tsx
/**
 * REAL SWE-bench evaluation with Claude Code patch generation
 * This generates ACTUAL patches and evaluates them
 */

import { Effect, Stream, Chunk, Layer, Console, pipe } from "effect";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { NodeFileSystem } from "@effect/platform-node";
import { SWEBenchPythonBridgeService, SWEBenchPrediction } from "../src/services/swe_bench_harness/SWEBenchPythonBridgeService";
import { SWEBenchPythonBridgeServiceLive } from "../src/services/swe_bench_harness/SWEBenchPythonBridgeServiceImpl";
import { SWEBenchTaskService } from "../src/services/swe_bench_harness";
import { TelemetryServiceLive } from "../src/services/telemetry";
import { TelemetryServiceCliConfigLayer } from "../src/services/telemetry/TelemetryServiceCliConfig";
import { SWEBenchCliLayer } from "../src/services/swe_bench_harness/layers/SWEBenchCliLayer";
import { generatePatchWithClaude, type PatchGenerationResult } from "./utils/claude-patch-generator";
import type { SWEBenchTask } from "../src/services/swe_bench_harness/types";
import * as path from "path";
import * as fs from "fs/promises";
import { execSync } from "child_process";

// Configuration
const MAX_INSTANCES = parseInt(process.env.MAX_INSTANCES || "5");
const DATASET_NAME = "princeton-nlp/SWE-bench_Lite";
const USE_CACHED_REPOS = process.env.USE_CACHED_REPOS !== "false";
const REPOS_CACHE_DIR = path.join(process.cwd(), ".swebench-repos");
const RUN_ID = `real-${Date.now()}`;

// Use virtual environment Python
process.env.PYTHON_EXECUTABLE = ".venv/bin/python";

interface EvaluationStats {
  totalInstances: number;
  patchesGenerated: number;
  patchGenerationFailures: number;
  evaluated: number;
  resolved: number;
  startTime: number;
  endTime?: number;
}

/**
 * Clone a repository at a specific commit
 */
async function cloneRepository(repo: string, commit: string): Promise<string> {
  const repoName = repo.replace("/", "-");
  const repoPath = path.join(REPOS_CACHE_DIR, repoName);
  
  if (USE_CACHED_REPOS && await fs.access(repoPath).then(() => true).catch(() => false)) {
    console.log(`  Using cached repository at ${repoPath}`);
    // Reset to the correct commit
    try {
      execSync(`cd ${repoPath} && git fetch --depth 1 origin ${commit} && git checkout ${commit}`, { 
        stdio: 'pipe' 
      });
    } catch (e) {
      // If specific commit fetch fails, try a full fetch
      console.log(`  Fetching full history for ${repo}...`);
      execSync(`cd ${repoPath} && git fetch --unshallow && git checkout ${commit}`, { 
        stdio: 'pipe' 
      });
    }
    return repoPath;
  }
  
  // Clone fresh
  await fs.mkdir(REPOS_CACHE_DIR, { recursive: true });
  console.log(`  Cloning ${repo} at ${commit}...`);
  
  try {
    execSync(
      `cd ${REPOS_CACHE_DIR} && git clone --depth 1 https://github.com/${repo}.git ${repoName}`,
      { stdio: 'pipe' }
    );
    execSync(`cd ${repoPath} && git fetch --depth 1 origin ${commit} && git checkout ${commit}`, {
      stdio: 'pipe'
    });
  } catch (e) {
    // If shallow clone fails, try full clone
    console.log(`  Shallow clone failed, trying full clone...`);
    execSync(
      `cd ${REPOS_CACHE_DIR} && rm -rf ${repoName} && git clone https://github.com/${repo}.git ${repoName}`,
      { stdio: 'pipe' }
    );
    execSync(`cd ${repoPath} && git checkout ${commit}`, {
      stdio: 'pipe'
    });
  }
  
  return repoPath;
}

/**
 * Extract test file paths from a test patch
 */
function extractTestFilesFromPatch(testPatch: string): string[] {
  const files: string[] = [];
  const lines = testPatch.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('diff --git')) {
      const match = line.match(/diff --git a\/(.*) b\/(.*)/);
      if (match) {
        files.push(match[1]);
      }
    }
  }
  
  return files;
}

/**
 * Find source files related to test files
 */
async function findRelatedSourceFiles(repoPath: string, testFiles: string[]): Promise<string[]> {
  const sourceFiles: string[] = [];
  
  for (const testFile of testFiles) {
    // Common patterns for test -> source mapping
    const patterns = [
      testFile.replace(/test_/, '').replace(/_test/, ''),
      testFile.replace(/tests?\//, ''),
      testFile.replace(/_test\.py$/, '.py'),
      testFile.replace(/test_(.*)\.py$/, '$1.py'),
      testFile.replace(/tests\/(.*)\/test_(.*)\.py$/, '$1/$2.py')
    ];
    
    for (const pattern of patterns) {
      const fullPath = path.join(repoPath, pattern);
      try {
        await fs.access(fullPath);
        sourceFiles.push(pattern);
        break;
      } catch {
        // Try next pattern
      }
    }
  }
  
  return [...new Set(sourceFiles)];
}

/**
 * Read file contents for context
 */
async function readFileContents(repoPath: string, files: string[]): Promise<Map<string, string>> {
  const contents = new Map<string, string>();
  
  for (const file of files) {
    try {
      const content = await fs.readFile(path.join(repoPath, file), 'utf-8');
      contents.set(file, content);
    } catch (e) {
      console.log(`  Warning: Could not read ${file}`);
    }
  }
  
  return contents;
}

/**
 * Build a comprehensive prompt with repository context
 */
function buildEnhancedPrompt(
  task: SWEBenchTask,
  fileContents: Map<string, string>
): string {
  let prompt = `You are an expert software engineer tasked with fixing a bug in the ${task.repo} repository.

Repository: ${task.repo}
Instance ID: ${task.instance_id}
Base Commit: ${task.base_commit}

Problem Statement:
${task.problem_statement}

`;

  if (task.hints_text) {
    prompt += `Hints:
${task.hints_text}

`;
  }

  // Add test patch information
  prompt += `Test Patch (these tests should pass after your fix):
\`\`\`diff
${task.test_patch}
\`\`\`

`;

  // Add relevant source files
  if (fileContents.size > 0) {
    prompt += `Relevant Source Files:\n\n`;
    for (const [file, content] of fileContents) {
      // Limit content length to avoid token limits
      const truncatedContent = content.length > 2000 
        ? content.substring(0, 2000) + '\n... (truncated)'
        : content;
      
      prompt += `File: ${file}
\`\`\`python
${truncatedContent}
\`\`\`

`;
    }
  }

  prompt += `Instructions:
1. Analyze the problem statement and failing tests carefully
2. Look at the test patch to understand what behavior is expected
3. Generate a minimal patch that fixes the issue
4. The patch should be in unified diff format (as produced by 'git diff')
5. Only include changes that are directly related to fixing the issue
6. Ensure the patch follows the coding style of the repository
7. Make sure your fix will make the failing tests pass

Generate the patch now. Output ONLY the patch in unified diff format, starting with "diff --git" and nothing else.`;

  return prompt;
}

/**
 * Generate a real patch with full context
 */
async function generateRealPatch(task: SWEBenchTask): Promise<PatchGenerationResult> {
  console.log(`  🔍 Analyzing ${task.instance_id}...`);
  
  try {
    // Clone repository
    const repoPath = await cloneRepository(task.repo, task.base_commit);
    
    // Extract test files and find related source files
    const testFiles = extractTestFilesFromPatch(task.test_patch);
    console.log(`  Found ${testFiles.length} test files`);
    
    const sourceFiles = await findRelatedSourceFiles(repoPath, testFiles);
    console.log(`  Found ${sourceFiles.length} related source files`);
    
    // Read file contents for context
    const fileContents = await readFileContents(repoPath, [...testFiles, ...sourceFiles]);
    
    // Build enhanced prompt with context
    const enhancedTask = {
      ...task,
      problem_statement: buildEnhancedPrompt(task, fileContents)
    };
    
    // Generate patch with Claude
    console.log(`  🤖 Generating patch with Claude...`);
    const result = await generatePatchWithClaude(enhancedTask, {
      maxRetries: 2,
      includeTestInfo: true,
      streamingCallback: (msg) => {
        if (msg.type === 'assistant' && msg.message?.content) {
          process.stdout.write('.');
        }
      },
      debug: false,
      timeout: 120000 // 2 minutes
    });
    
    if (result.success) {
      console.log(`\n  ✅ Patch generated (${result.patch!.length} chars)`);
    } else {
      console.log(`\n  ❌ Failed to generate patch: ${result.error}`);
    }
    
    return result;
    
  } catch (error) {
    console.log(`  ❌ Error: ${error}`);
    return {
      success: false,
      error: String(error),
      attempts: 1,
      duration: 0
    };
  }
}

async function runRealEvaluation() {
  console.log("🚀 SWE-bench REAL Evaluation with Claude Patches");
  console.log("================================================");
  console.log(`Max Instances: ${MAX_INSTANCES}`);
  console.log(`Dataset: ${DATASET_NAME}`);
  console.log(`Run ID: ${RUN_ID}`);
  console.log(`Cache Directory: ${REPOS_CACHE_DIR}`);
  console.log("");
  
  const stats: EvaluationStats = {
    totalInstances: MAX_INSTANCES,
    patchesGenerated: 0,
    patchGenerationFailures: 0,
    evaluated: 0,
    resolved: 0,
    startTime: Date.now()
  };
  
  const program = Effect.gen(function* () {
    const bridge = yield* SWEBenchPythonBridgeService;
    const taskService = yield* SWEBenchTaskService;
    
    // Initialize the bridge
    console.log("Initializing Python bridge...");
    yield* bridge.initialize();
    console.log("✅ Python bridge initialized\n");
    
    // Load task IDs
    const allTaskIds = yield* taskService.listAvailableTaskIds();
    const selectedTaskIds = allTaskIds.slice(0, MAX_INSTANCES);
    
    console.log(`📋 Selected ${selectedTaskIds.length} tasks for evaluation:\n`);
    selectedTaskIds.forEach(id => console.log(`  - ${id}`));
    console.log("");
    
    // Generate predictions with REAL patches
    const predictions: SWEBenchPrediction[] = [];
    const failedTasks: string[] = [];
    
    for (let i = 0; i < selectedTaskIds.length; i++) {
      const taskId = selectedTaskIds[i];
      console.log(`\n[${i + 1}/${selectedTaskIds.length}] Processing ${taskId}`);
      
      try {
        // Load task
        const task = yield* taskService.getTask(taskId);
        console.log(`  Repo: ${task.repo}`);
        console.log(`  Problem: ${task.problem_statement.substring(0, 80)}...`);
        
        // Generate REAL patch with repository context
        const patchResult = yield* Effect.tryPromise(() => generateRealPatch(task));
        
        if (patchResult.success && patchResult.patch) {
          predictions.push({
            instance_id: task.instance_id,
            model_name_or_path: "claude-3-5-sonnet-20241022",
            model_patch: patchResult.patch
          });
          stats.patchesGenerated++;
          
          // Save patch for inspection
          const patchFile = `./swebench-results/${RUN_ID}/${taskId}.patch`;
          yield* Effect.tryPromise(() => 
            fs.mkdir(path.dirname(patchFile), { recursive: true })
          );
          yield* Effect.tryPromise(() => 
            fs.writeFile(patchFile, patchResult.patch!)
          );
          
        } else {
          console.log(`  ⚠️  Skipping evaluation due to patch generation failure`);
          stats.patchGenerationFailures++;
          failedTasks.push(taskId);
          
          // Still add to predictions with empty patch to track
          predictions.push({
            instance_id: task.instance_id,
            model_name_or_path: "claude-3-5-sonnet-20241022-failed",
            model_patch: ""
          });
        }
        
      } catch (error) {
        console.error(`  ❌ Error processing task: ${error}`);
        stats.patchGenerationFailures++;
        failedTasks.push(taskId);
      }
    }
    
    console.log(`\n📊 Patch Generation Summary:`);
    console.log(`  Generated: ${stats.patchesGenerated}/${stats.totalInstances}`);
    console.log(`  Failed: ${stats.patchGenerationFailures}`);
    
    if (predictions.length === 0) {
      console.log("\n❌ No patches generated, skipping evaluation");
      return;
    }
    
    // Run evaluation with real patches
    console.log("\n🚀 Starting Docker evaluation...");
    const stream = bridge.runEvaluation(predictions, {
      dataset_name: DATASET_NAME,
      max_workers: 1,  // Single worker for safety
      timeout: 1800,
      instance_ids: selectedTaskIds,
      namespace: "none"  // Use local images
    });
    
    // Process results
    const results = yield* stream.pipe(
      Stream.tap(msg => Effect.sync(() => {
        switch (msg.type) {
          case "progress":
            const progress = msg.data.percentage || 0;
            const completed = msg.data.completed || 0;
            console.log(`📊 Progress: ${progress.toFixed(1)}% (${completed}/${predictions.length})`);
            break;
          case "status":
            console.log(`[Status] ${msg.data.message}`);
            break;
          case "error":
            console.error(`❌ Error: ${msg.data.message}`);
            break;
        }
      })),
      Stream.runCollect,
      Effect.map(Chunk.toArray)
    );
    
    // Find completion
    const completeMsg = results.find(m => m.type === "complete");
    if (completeMsg) {
      stats.evaluated = completeMsg.data.summary.evaluated;
      stats.resolved = completeMsg.data.summary.resolved;
      stats.endTime = Date.now();
      
      // Save detailed results
      const resultsFile = `./swebench-results/${RUN_ID}/results.json`;
      yield* Effect.tryPromise(() => 
        fs.writeFile(resultsFile, JSON.stringify({
          ...completeMsg.data,
          patchGenerationStats: stats,
          failedTasks
        }, null, 2))
      );
      
      // Print summary
      const duration = ((stats.endTime - stats.startTime) / 1000 / 60).toFixed(2);
      
      console.log("\n" + "=".repeat(60));
      console.log("🎉 REAL EVALUATION COMPLETE!");
      console.log("=".repeat(60));
      console.log(`Total Tasks: ${stats.totalInstances}`);
      console.log(`Patches Generated: ${stats.patchesGenerated}`);
      console.log(`Patch Generation Failures: ${stats.patchGenerationFailures}`);
      console.log(`Evaluated: ${stats.evaluated}`);
      console.log(`Resolved (Tests Pass): ${stats.resolved}`);
      console.log(`Success Rate: ${(stats.resolved / stats.evaluated * 100).toFixed(2)}%`);
      console.log(`Duration: ${duration} minutes`);
      console.log("=".repeat(60));
      console.log(`\n✨ REAL SWE-BENCH SCORE: ${(stats.resolved / stats.totalInstances * 100).toFixed(2)}%`);
      console.log("=".repeat(60));
      console.log(`\n📁 Results saved to: ./swebench-results/${RUN_ID}/`);
      
      if (failedTasks.length > 0) {
        console.log(`\n⚠️  Failed to generate patches for:`);
        failedTasks.forEach(id => console.log(`  - ${id}`));
      }
    }
  });
  
  // Use the complete CLI layer that includes all services
  const layer = SWEBenchCliLayer;
  
  await Effect.runPromise(
    program.pipe(Effect.provide(layer))
  );
}

// Parse command line args
const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log(`
Usage: pnpm tsx scripts/run-swebench-real.ts [options]

Options:
  --max-instances N    Number of instances to evaluate (default: 5)
  --no-cache          Don't use cached repositories
  --help              Show this help

Environment variables:
  MAX_INSTANCES       Number of instances (default: 5)
  USE_CACHED_REPOS    Use cached repo clones (default: true)

Example:
  pnpm tsx scripts/run-swebench-real.ts --max-instances 10
`);
  process.exit(0);
}

// Handle command line args
if (args.includes('--max-instances')) {
  const idx = args.indexOf('--max-instances');
  if (idx < args.length - 1) {
    process.env.MAX_INSTANCES = args[idx + 1];
  }
}

if (args.includes('--no-cache')) {
  process.env.USE_CACHED_REPOS = 'false';
}

// Run the evaluation
console.log("\n🏁 Starting REAL SWE-bench evaluation with Claude patches...\n");
runRealEvaluation().catch(error => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});