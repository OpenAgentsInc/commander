#!/usr/bin/env tsx
/**
 * SWE-Bench Harness Integration Test Script
 *
 * Run with: pnpm test:swebench
 */

import { Effect, Exit, Layer, Console, Cause } from "effect";
// Adjust path if FullSWEBenchHarnessLayer is defined elsewhere (e.g., src/services/runtime.ts)
import { FullSWEBenchHarnessLayer } from "@/services/swe_bench_harness/example-layer-composition";
import { SWEBenchHarnessService } from "@/services/swe_bench_harness";

const testProgram = Effect.gen(function* (_) {
  const harness = yield* _(SWEBenchHarnessService);

  yield* _(Console.log("🚀 SWE-Bench Harness Integration Test Starting..."));

  const instanceId = "astropy__astropy-6938";
  // Use a simple test patch for astropy
  const patchContent = `--- a/astropy/io/fits/card.py
+++ b/astropy/io/fits/card.py
@@ -1,4 +1,4 @@
-# Licensed under a 3-clause BSD style license - see LICENSE.rst
+# Licensed under a 3-clause BSD style license - see LICENSE.rst.`;

  yield* _(Console.log(`Evaluating task: ${instanceId}`));

  const result = yield* _(harness.evaluateTask(instanceId, patchContent).pipe(
    Effect.tapError((error) => Console.log(`Error during evaluation: ${JSON.stringify(error)}`))
  ));

  yield* _(Console.log("\n✅ Evaluation Result:"));
  // Using Node's console.log for potentially large/nested objects
  console.log(JSON.stringify(result, null, 2));

  if (result.report.resolved) {
    yield* _(Console.log("\n🎉 Test PASSED: Task resolved successfully."));
  } else {
    yield* _(Console.error("\n❌ Test FAILED: Task was not resolved."));
    if (result.error_message) {
        yield* _(Console.error(`Harness Error: ${result.error_message}`));
    }
    if (result.report.patch_applied_successfully === false) {
         yield* _(Console.error("Patch application failed."));
    }
    if (result.report.tests_passed === false) {
         yield* _(Console.error("Tests did not pass."));
    }
  }
});

const runTest = async () => {
  const result = await Effect.runPromiseExit(
    testProgram.pipe(Effect.provide(FullSWEBenchHarnessLayer))
  );

  if (Exit.isFailure(result)) {
    console.error("\n❌ Integration Test CRASHED!");
    const cause = Cause.squash(result.cause);
    console.error("Error details:", JSON.stringify(cause, Object.getOwnPropertyNames(cause), 2));
    process.exit(1);
  } else {
    console.log("\n🏁 Integration Test Completed.");
    process.exit(0);
  }
};

runTest().catch(error => {
  console.error("Unhandled error running integration test:", error);
  process.exit(1);
});