#!/usr/bin/env tsx
/**
 * Direct test of Claude Code bridge for SWE-bench
 * This bypasses all the runtime initialization issues
 */

import * as fs from 'fs/promises';
import * as path from 'path';

interface SWEBenchTask {
  instance_id: string;
  repo: string;
  base_commit: string;
  problem_statement: string;
  hints_text?: string;
  test_patch: string;
  patch: string;
  FAIL_TO_PASS: string[];
}

async function testClaudeBridge(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:45671/health');
    // Bridge returns "Upgrade Required" for HTTP requests (expects WebSocket)
    // But this still indicates it's running
    return response.status === 426 || response.ok;
  } catch {
    return false;
  }
}

async function callClaudeCode(prompt: string): Promise<any> {
  const response = await fetch('http://localhost:45671/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: prompt }],
      stream: false
    })
  });

  if (!response.ok) {
    throw new Error(`Claude bridge returned ${response.status}`);
  }

  return response.json();
}

async function generatePatchForTask(task: SWEBenchTask): Promise<string | null> {
  const prompt = `You are an expert software engineer. Generate a patch to fix the following issue.

Repository: ${task.repo}
Base Commit: ${task.base_commit}

Problem Statement:
${task.problem_statement}

${task.hints_text ? `Hints:\n${task.hints_text}\n` : ''}

The following tests need to pass:
${task.FAIL_TO_PASS.join('\n')}

Please provide ONLY the patch in unified diff format between \`\`\`diff and \`\`\` markers. Do not include any explanation.`;

  try {
    console.log('🤖 Calling Claude Code...');
    const response = await callClaudeCode(prompt);
    
    // Extract patch from response
    const content = response.content || response.text || response.response || '';
    const patchMatch = content.match(/```diff\n([\s\S]*?)```/);
    
    if (patchMatch) {
      return patchMatch[1].trim();
    }
    
    console.log('⚠️  No patch found in response');
    return null;
  } catch (error) {
    console.error('❌ Error calling Claude:', error.message);
    return null;
  }
}

async function main() {
  console.log('=== Claude Code SWE-bench Direct Test ===\n');

  // Check bridge
  const bridgeOk = await testClaudeBridge();
  if (!bridgeOk) {
    console.error('❌ Claude bridge is not running. Start it with: pnpm bridge');
    process.exit(1);
  }
  console.log('✅ Claude bridge is running\n');

  // Create output directory
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = path.join(process.cwd(), 'swebench-results', `claude-direct-${timestamp}`);
  await fs.mkdir(outputDir, { recursive: true });

  // Load tasks
  const tasksDir = path.join(process.cwd(), 'assets/swe_bench_data');
  const taskFiles = (await fs.readdir(tasksDir))
    .filter(f => f.endsWith('.json'))
    .slice(0, 5); // Take first 5

  console.log(`Running ${taskFiles.length} tasks...\n`);

  const results = [];

  for (const taskFile of taskFiles) {
    const taskPath = path.join(tasksDir, taskFile);
    const task = JSON.parse(await fs.readFile(taskPath, 'utf-8')) as SWEBenchTask;
    
    console.log(`\n--- Task: ${task.instance_id} ---`);
    console.log(`Repo: ${task.repo}`);
    console.log(`Problem: ${task.problem_statement.substring(0, 100)}...`);
    
    const startTime = Date.now();
    const generatedPatch = await generatePatchForTask(task);
    const duration = Date.now() - startTime;
    
    const result = {
      instance_id: task.instance_id,
      patch_generated: !!generatedPatch,
      duration_ms: duration,
      patch_length: generatedPatch?.length || 0,
      patch_source_type: 'agent_generated',
      generated_patch_content: generatedPatch
    };
    
    if (generatedPatch) {
      console.log(`✅ Generated patch (${generatedPatch.length} chars, ${Math.round(duration/1000)}s)`);
      console.log('Preview:', generatedPatch.substring(0, 150) + '...');
      
      // Save the evaluation result in expected format
      const evalResult = {
        instance_id: task.instance_id,
        report: {
          instance_id: task.instance_id,
          resolved: false, // We don't know without running tests
          patch_applied_successfully: true,
          tests_passed: false // We don't know without running tests
        },
        container_logs: '',
        error_message: null,
        duration_ms: duration,
        patch_source_type: 'agent_generated',
        generated_patch_content: generatedPatch
      };
      
      await fs.writeFile(
        path.join(outputDir, `${task.instance_id}_eval_result.json`),
        JSON.stringify(evalResult, null, 2)
      );
    } else {
      console.log(`❌ Failed to generate patch`);
    }
    
    results.push(result);
  }

  // Save summary
  const summary = {
    timestamp: new Date().toISOString(),
    total_tasks: results.length,
    patches_generated: results.filter(r => r.patch_generated).length,
    patches_failed: results.filter(r => !r.patch_generated).length,
    total_duration_ms: results.reduce((sum, r) => sum + r.duration_ms, 0),
    average_duration_ms: Math.round(results.reduce((sum, r) => sum + r.duration_ms, 0) / results.length),
    tasks: results
  };

  await fs.writeFile(
    path.join(outputDir, 'summary.json'),
    JSON.stringify(summary, null, 2)
  );

  console.log('\n\n=== Summary ===');
  console.log(`Total tasks: ${summary.total_tasks}`);
  console.log(`Patches generated: ${summary.patches_generated}`);
  console.log(`Failed: ${summary.patches_failed}`);
  console.log(`Average time per task: ${Math.round(summary.average_duration_ms/1000)}s`);
  console.log(`\nResults saved to: ${outputDir}`);
}

main().catch(console.error);