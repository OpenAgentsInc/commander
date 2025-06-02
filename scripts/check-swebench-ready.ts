#!/usr/bin/env tsx
/**
 * Quick check to verify SWE-bench components are ready
 */

import { Effect } from "effect";
import { ClaudeCliExecutorService, ClaudeCliExecutorServiceLive } from "../src/services/claude-cli";
import * as fs from "fs";
import * as path from "path";

console.log("🔍 SWE-bench Readiness Check\n");

const checks = {
  claudeCli: false,
  claudeAuth: false,
  datasetPath: false,
  tasksExist: false,
  dockerAvailable: false,
  apiKey: false
};

// Check 1: Claude CLI
const checkProgram = Effect.gen(function* () {
  const executor = yield* ClaudeCliExecutorService;
  
  console.log("1. Checking Claude CLI...");
  const health = yield* executor.checkHealth();
  checks.claudeCli = health.available;
  checks.claudeAuth = health.authenticated;
  
  console.log(`   ✓ Claude CLI: ${health.available ? '✅' : '❌'} ${health.claudePath || 'Not found'}`);
  console.log(`   ✓ Authenticated: ${health.authenticated ? '✅' : '❌'}`);
  console.log(`   ✓ Version: ${health.version || 'Unknown'}`);
  
  return health;
});

Effect.runPromise(
  checkProgram.pipe(Effect.provide(ClaudeCliExecutorServiceLive))
).then(() => {
  // Check 2: Dataset Path
  console.log("\n2. Checking SWE-bench dataset...");
  const datasetPath = process.env.SWE_BENCH_DATASET_PATH || "./assets/swebench-tasks";
  checks.datasetPath = fs.existsSync(datasetPath);
  console.log(`   ✓ Dataset path: ${checks.datasetPath ? '✅' : '❌'} ${datasetPath}`);
  
  if (checks.datasetPath) {
    const taskFiles = fs.readdirSync(datasetPath).filter(f => f.endsWith('.json'));
    checks.tasksExist = taskFiles.length > 0;
    console.log(`   ✓ Task files: ${checks.tasksExist ? '✅' : '❌'} Found ${taskFiles.length} tasks`);
    
    if (taskFiles.length > 0) {
      console.log(`   ✓ Example tasks: ${taskFiles.slice(0, 3).join(', ')}...`);
    }
  }
  
  // Check 3: Docker
  console.log("\n3. Checking Docker...");
  try {
    require('child_process').execSync('docker --version', { stdio: 'ignore' });
    checks.dockerAvailable = true;
    console.log(`   ✓ Docker: ✅ Available`);
  } catch {
    console.log(`   ✓ Docker: ❌ Not available (required for full evaluation)`);
  }
  
  // Check 4: API Key (not needed for Claude Code)
  console.log("\n4. Checking API keys...");
  console.log(`   ✓ ANTHROPIC_API_KEY: Not needed - Claude Code uses CLI authentication`);
  
  // Summary
  console.log("\n📊 Summary:");
  const ready = checks.claudeCli && checks.claudeAuth && checks.datasetPath && checks.tasksExist;
  const partialReady = ready;  // API key not needed for Claude Code
  const fullyReady = partialReady && checks.dockerAvailable;
  
  if (fullyReady) {
    console.log("✅ All systems ready! You can run full SWE-bench evaluations.");
  } else if (partialReady) {
    console.log("⚠️  Ready for patch generation only. Install Docker for full evaluation.");
  } else if (ready) {
    console.log("⚠️  Basic setup complete. Set ANTHROPIC_API_KEY to use Claude.");
  } else {
    console.log("❌ Not ready. Fix the issues above.");
  }
  
  // Next steps
  console.log("\n📝 Next steps:");
  if (!checks.claudeCli) {
    console.log("1. Install Claude CLI: npm install -g @anthropic-ai/claude-code");
  }
  if (!checks.claudeAuth) {
    console.log("2. Authenticate Claude: claude auth");
  }
  if (!checks.datasetPath || !checks.tasksExist) {
    console.log("3. Ensure SWE-bench tasks are in ./assets/swebench-tasks/");
  }
  if (!checks.dockerAvailable) {
    console.log("4. Install Docker Desktop for full evaluation support");
  }
  
  if (partialReady) {
    console.log("\n🚀 Ready to test! Try:");
    console.log("   pnpm tsx scripts/run-swebench-debug.ts simple-python-fix");
  }
  
}).catch(error => {
  console.error("❌ Check failed:", error);
  process.exit(1);
});