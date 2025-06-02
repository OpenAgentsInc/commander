#!/usr/bin/env tsx
/**
 * Direct test of Claude with the SymPy problem
 */

import { Effect } from "effect";
import { ClaudeCliExecutorService, ClaudeCliExecutorServiceLive } from "../src/services/claude-cli";

const program = Effect.gen(function* () {
  const executor = yield* ClaudeCliExecutorService;
  
  console.log("🧪 Testing Claude directly with SymPy problem...\n");
  
  // Simpler, more direct prompt
  const prompt = `Fix this bug in SymPy:

Problem: Sum(1, (n, a, b)) should return b - a + 1

The issue is in sympy/concrete/summations.py in the Sum.doit() method. When summing 1 from n=a to n=b, it should return b - a + 1.

Generate a patch in diff format to fix this. Output ONLY the patch, no explanation.`;

  console.log("Sending prompt to Claude...");
  console.log("Prompt:", prompt);
  console.log("\nWaiting for response (this may take a minute)...");
  
  const response = yield* executor.execute([
    '-p', prompt,
    '--output-format', 'text',
    '--dangerously-skip-permissions'
  ]);
  
  console.log("\nResponse:");
  console.log("─".repeat(60));
  console.log(response);
  console.log("─".repeat(60));
  
  return response;
});

Effect.runPromise(
  program.pipe(Effect.provide(ClaudeCliExecutorServiceLive))
)
  .then(() => {
    console.log("\n✅ Success!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Failed:", error);
    process.exit(1);
  });