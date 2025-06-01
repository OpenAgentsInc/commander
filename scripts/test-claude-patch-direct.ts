#!/usr/bin/env tsx
/**
 * Test Claude Code patch generation directly
 */

import { spawn } from 'child_process';
import * as path from 'path';

async function testClaudePatchGeneration() {
  console.log("Testing Claude Code patch generation directly...\n");
  
  const taskPath = path.join(process.cwd(), 'assets/swe_bench_data/sympy__sympy-12419.json');
  const task = require(taskPath);
  
  const prompt = `You are an AI coding assistant. Your task is to fix a bug in a software repository.

Problem Description:
${task.problem_statement}

Hints (if any):
${task.hints_text || "No specific hints provided."}

The relevant codebase is located on the local filesystem at:
/tmp/test-repo

Please analyze the problem and the codebase.
Then, generate a patch in the standard 'diff' format to resolve the issue.
Output ONLY the patch content, enclosed in markdown code fences like this:
\`\`\`diff
--- a/path/to/file.py
+++ b/path/to/file.py
@@ ... @@
... patch content ...
\`\`\`
Do not include any other explanatory text before or after the diff block.`;

  console.log("Sending prompt to Claude CLI...\n");
  
  // Call Claude CLI directly
  const claudeProcess = spawn('claude', [
    '-p', prompt,
    '--output-format', 'stream-json',
    '--verbose'
  ], {
    stdio: ['inherit', 'pipe', 'pipe']
  });
  
  let fullOutput = '';
  let fullError = '';
  
  claudeProcess.stdout.on('data', (data) => {
    const chunk = data.toString();
    fullOutput += chunk;
    
    // Try to parse streaming JSON
    const lines = chunk.split('\n').filter(line => line.trim());
    for (const line of lines) {
      try {
        const json = JSON.parse(line);
        if (json.type === 'content_block_delta' && json.delta?.text) {
          process.stdout.write(json.delta.text);
        }
      } catch {
        // Not JSON, might be other output
      }
    }
  });
  
  claudeProcess.stderr.on('data', (data) => {
    fullError += data.toString();
  });
  
  return new Promise((resolve, reject) => {
    claudeProcess.on('close', (code) => {
      console.log("\n\n=== Process completed with code:", code, "===");
      
      if (fullError) {
        console.error("STDERR:", fullError);
      }
      
      // Check if we got a patch
      const diffRegex = /```diff\s*([\s\S]*?)\s*```/;
      const match = fullOutput.match(diffRegex);
      
      if (match && match[1]) {
        console.log("\n✅ Successfully extracted patch!");
        console.log("Patch content:");
        console.log(match[1]);
        resolve(match[1]);
      } else {
        console.log("\n❌ No patch found in output");
        console.log("Full output:", fullOutput);
        reject(new Error("No patch found"));
      }
    });
  });
}

testClaudePatchGeneration().catch(console.error);