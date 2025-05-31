#!/usr/bin/env tsx
/**
 * Demo of SWE-bench lifecycle - shows what would happen during task execution
 */

import * as fs from "fs";
import * as path from "path";

// Parse command line arguments
const args = process.argv.slice(2);
const taskFile = args[0];

if (!taskFile) {
  console.error("Usage: pnpm tsx scripts/demo-swebench-lifecycle.ts <task.json>");
  process.exit(1);
}

// Load task
const task = JSON.parse(fs.readFileSync(taskFile, 'utf-8'));

console.log(`\n🔧 SWE-bench Task Lifecycle Demo`);
console.log(`================================\n`);

console.log(`📋 Task: ${task.instance_id}`);
console.log(`📦 Repository: ${task.repo}`);
console.log(`🔖 Base commit: ${task.base_commit}`);
console.log(`🧪 Tests to fix: ${task.FAIL_TO_PASS.join(', ')}\n`);

console.log(`📝 What would happen during execution:\n`);

console.log(`1. 🐳 Docker Image Build`);
console.log(`   - Base image: swebench/swe-eval:latest`);
console.log(`   - Clone repo: https://github.com/${task.repo}.git`);
console.log(`   - Checkout commit: ${task.base_commit}`);
console.log(`   - Image name: swe-bench-task/${task.instance_id.replace(/[\/\:]/g, '--')}:latest\n`);

console.log(`2. 🏗️  Container Setup`);
console.log(`   - Mount evaluation directory`);
console.log(`   - Working directory: /opt/swe-bench/repo`);
console.log(`   - Keep container running with tail -f /dev/null\n`);

console.log(`3. 🧪 Test Execution`);
console.log(`   - Apply test patch to add failing tests`);
console.log(`   - Run baseline tests (should fail)`);
console.log(`   - Apply solution patch (if provided)`);
console.log(`   - Run tests again (should pass if patch is correct)\n`);

console.log(`4. 📊 Expected Test Commands`);
const repo_name = task.repo.split('/')[1];
if (repo_name === 'sympy') {
  console.log(`   - cd /opt/swe-bench/repo`);
  console.log(`   - python -m pytest ${task.FAIL_TO_PASS.join(' ')} -xvs`);
} else if (repo_name === 'django') {
  console.log(`   - cd /opt/swe-bench/repo`);
  console.log(`   - python tests/runtests.py ${task.FAIL_TO_PASS.join(' ')}`);
} else {
  console.log(`   - cd /opt/swe-bench/repo`);
  console.log(`   - pytest ${task.FAIL_TO_PASS.join(' ')} -xvs`);
}

console.log(`\n5. 🧹 Cleanup`);
console.log(`   - Stop and remove container`);
console.log(`   - Remove Docker image`);
console.log(`   - Clean up temporary directories\n`);

console.log(`📄 Problem Statement:`);
console.log(`${task.problem_statement.substring(0, 300)}...`);

if (task.hints_text) {
  console.log(`\n💡 Hints:`);
  console.log(`${task.hints_text.substring(0, 200)}...`);
}

console.log(`\n✨ To actually run this task:`);
console.log(`1. Ensure Docker is running`);
console.log(`2. Have the swebench/swe-eval:latest base image`);
console.log(`3. Use the full SWEBenchHarnessService`);

// Show the test patch
console.log(`\n📝 Test Patch Preview:`);
const testPatchLines = task.test_patch.split('\n').slice(0, 20);
console.log(testPatchLines.join('\n'));
if (task.test_patch.split('\n').length > 20) {
  console.log(`... (${task.test_patch.split('\n').length - 20} more lines)`);
}