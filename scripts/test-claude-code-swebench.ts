#!/usr/bin/env tsx
/**
 * Direct test of Claude Code agent on SWE-bench tasks
 * This bypasses the full runtime and tests the core functionality
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { Effect, Layer, pipe } from 'effect';
import { NodeFileSystem } from '@effect/platform-node';
import { NodeRuntime } from '@effect/platform-node';

// Import only what we need
import type { SWEBenchTask } from '@/services/swe_bench_harness/types';
import { ConfigurationServiceLive, DefaultDevConfigLayer } from '@/services/configuration';
import { TelemetryServiceLive, DefaultTelemetryConfigLayer } from '@/services/telemetry';
import { HttpClient, HttpClientRequest } from '@effect/platform';
import { BrowserHttpClient } from '@effect/platform-browser';

// Simple mock layer for HttpClient
const MockHttpClientLayer = Layer.succeed(HttpClient.HttpClient, {
  execute: () => Effect.fail(new Error("HTTP not available in test")),
  get: (url: string) => Effect.fail(new Error("HTTP not available in test")),
  post: (url: string) => Effect.fail(new Error("HTTP not available in test")),
  put: (url: string) => Effect.fail(new Error("HTTP not available in test")),
  patch: (url: string) => Effect.fail(new Error("HTTP not available in test")),
  del: (url: string) => Effect.fail(new Error("HTTP not available in test")),
  head: (url: string) => Effect.fail(new Error("HTTP not available in test")),
  options: (url: string) => Effect.fail(new Error("HTTP not available in test")),
} as any);

async function testClaudeBridge() {
  console.log("🔍 Testing Claude bridge connection...");
  
  try {
    const response = await fetch('http://localhost:45671/health');
    if (response.ok) {
      console.log("✅ Claude bridge is healthy");
      return true;
    } else {
      console.log("❌ Claude bridge returned status:", response.status);
      return false;
    }
  } catch (error) {
    console.log("❌ Could not connect to Claude bridge:", error.message);
    return false;
  }
}

async function sendClaudeRequest(taskDescription: string): Promise<string | null> {
  try {
    const response = await fetch('http://localhost:45671/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{
          role: 'user',
          content: `Generate a patch for this SWE-bench task:\n\n${taskDescription}\n\nProvide the patch in diff format between \`\`\`diff and \`\`\` markers.`
        }]
      })
    });

    if (!response.ok) {
      console.log("❌ Claude request failed:", response.status);
      return null;
    }

    const data = await response.json();
    
    // Extract patch from response
    const patchMatch = data.response?.match(/```diff\n([\s\S]*?)```/);
    return patchMatch ? patchMatch[1] : null;
  } catch (error) {
    console.log("❌ Error calling Claude:", error.message);
    return null;
  }
}

async function main() {
  console.log("=== Claude Code SWE-bench Test ===\n");

  // Test bridge connection first
  const bridgeOk = await testClaudeBridge();
  if (!bridgeOk) {
    console.log("\n⚠️  Please ensure Claude bridge is running: pnpm bridge");
    process.exit(1);
  }

  // Load tasks
  const tasksDir = path.join(process.cwd(), 'assets/swe_bench_data');
  const taskFiles = await fs.readdir(tasksDir);
  const jsonFiles = taskFiles.filter(f => f.endsWith('.json')).slice(0, 5);

  console.log(`\n📋 Testing with ${jsonFiles.length} tasks\n`);

  const results = [];
  
  for (const taskFile of jsonFiles) {
    const taskPath = path.join(tasksDir, taskFile);
    const taskData = JSON.parse(await fs.readFile(taskPath, 'utf-8')) as SWEBenchTask;
    
    console.log(`\n--- Task: ${taskData.instance_id} ---`);
    console.log(`Repository: ${taskData.repo}`);
    console.log(`Problem: ${taskData.problem_statement.substring(0, 200)}...`);
    
    // Generate task description
    const taskDescription = `
Repository: ${taskData.repo}
Instance ID: ${taskData.instance_id}
Base Commit: ${taskData.base_commit}

Problem Statement:
${taskData.problem_statement}

${taskData.hints_text ? `Hints:\n${taskData.hints_text}` : ''}

Tests to make pass:
${taskData.FAIL_TO_PASS.join('\n')}
`;

    console.log("\n🤖 Requesting patch from Claude Code...");
    const patch = await sendClaudeRequest(taskDescription);
    
    if (patch) {
      console.log("✅ Received patch:");
      console.log(patch.substring(0, 200) + "...");
      
      results.push({
        instance_id: taskData.instance_id,
        success: true,
        patch_length: patch.length
      });
    } else {
      console.log("❌ Failed to get patch");
      results.push({
        instance_id: taskData.instance_id,
        success: false
      });
    }
  }

  // Summary
  console.log("\n\n=== Summary ===");
  console.log(`Total tasks: ${results.length}`);
  console.log(`Successful: ${results.filter(r => r.success).length}`);
  console.log(`Failed: ${results.filter(r => !r.success).length}`);
  
  // Save results
  const outputDir = path.join(process.cwd(), 'swebench-results', `claude-test-${Date.now()}`);
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(
    path.join(outputDir, 'test-results.json'),
    JSON.stringify(results, null, 2)
  );
  
  console.log(`\nResults saved to: ${outputDir}`);
}

main().catch(console.error);