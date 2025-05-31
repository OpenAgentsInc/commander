import { Effect, Layer } from "effect";
import { SWEBenchEvaluationScriptService } from "./SWEBenchEvaluationScriptService";
import type { SWEBenchTask } from "./types";
import { ScriptBuildError } from "./errors";
import { TelemetryService } from "@/services/telemetry";

export const SWEBenchEvaluationScriptServiceLive = Layer.effect(
  SWEBenchEvaluationScriptService,
  Effect.gen(function* () {
    const telemetry = yield* TelemetryService;

    return SWEBenchEvaluationScriptService.of({
      buildEvalScript: (task, patchFileNameInContainer, containerEvalDir, containerRepoPath) => 
        Effect.gen(function* () {
            // Patch application command
            // Try reverse apply first in case patch was already partially applied
            const patchPath = `${containerEvalDir}/${patchFileNameInContainer}`;
            const patchApplyCmd = `git apply -v --reverse ${patchPath} 2>/dev/null || git apply -v ${patchPath}`;

            // Test execution command
            // This is a simplified approach - real implementation would parse test_patch
            let testCmd = `echo "Test execution placeholder for ${task.instance_id}" && python -m pytest`;
            if (task.FAIL_TO_PASS && task.FAIL_TO_PASS.length > 0) {
              // Naive approach: assume FAIL_TO_PASS contains pytest markers or file paths
              testCmd = `python -m pytest ${task.FAIL_TO_PASS.join(" ")}`;
            }

            // Report generation
            const reportFile = "/tmp/report.json";

            const scriptContent = `#!/bin/bash
set -eo pipefail # Exit on error, treat pipe failures as errors

# Get conda environment name from Docker environment variable
CONDA_ENV_NAME_FROM_DOCKER_ENV="\${CONDA_ENV_NAME}"
echo "=== Activating Conda Environment from Docker ENV: \${CONDA_ENV_NAME_FROM_DOCKER_ENV} ==="

# Ensure conda is initialized for bash
source /opt/miniconda/etc/profile.d/conda.sh
conda activate "\${CONDA_ENV_NAME_FROM_DOCKER_ENV}"
if [ $? -ne 0 ]; then
  echo '{"error": "Conda activation failed in eval.sh"}' > ${reportFile}
  exit 1
fi
echo "Current Python: \$(which python) - \$(python --version)"
echo "Conda environment: \$CONDA_PREFIX"

echo "=== Navigating to Repository: ${containerRepoPath} ==="
cd "${containerRepoPath}"
if [ $? -ne 0 ]; then
  echo '{"error": "Failed to cd to repo"}' > ${reportFile}
  exit 1
fi

echo "=== Applying Patch: ${patchFileNameInContainer} ==="
PATCH_APPLIED_SUCCESSFULLY=false
(${patchApplyCmd})
if [ $? -eq 0 ]; then
  PATCH_APPLIED_SUCCESSFULLY=true
  echo "Patch applied successfully."
else
  echo "Patch application failed."
  # Even if patch fails, continue to see initial state if needed
  echo '{"instance_id": "${task.instance_id}", "patch_applied_successfully": false, "resolved": false}' > ${reportFile}
  exit 0 # Exit 0 so report.json can be collected
fi

echo "=== Running Tests ==="
TESTS_PASSED=false
TEST_OUTPUT_FILE="/tmp/test_output.txt"
(${testCmd}) > $TEST_OUTPUT_FILE 2>&1
TEST_EXIT_CODE=$?

if [ $TEST_EXIT_CODE -eq 0 ]; then
  TESTS_PASSED=true
  echo "Tests passed."
else
  echo "Tests failed with exit code $TEST_EXIT_CODE."
fi

# Create report.json
# This is a simplified report. Real SWE-bench has more detail.
cat > ${reportFile} << EOF
{
  "instance_id": "${task.instance_id}",
  "patch_applied_successfully": $PATCH_APPLIED_SUCCESSFULLY,
  "tests_passed": $TESTS_PASSED,
  "resolved": $([ "$PATCH_APPLIED_SUCCESSFULLY" = true ] && [ "$TESTS_PASSED" = true ] && echo true || echo false),
  "test_output_path": "$TEST_OUTPUT_FILE",
  "FAIL_TO_PASS": ${JSON.stringify(task.FAIL_TO_PASS)},
  "PASS_TO_PASS": ${JSON.stringify(task.PASS_TO_PASS)}
}
EOF

echo "=== Evaluation Complete. Report at ${reportFile} ==="
exit 0
`;
            
            // Track telemetry event
            yield* telemetry.trackEvent({ 
              category: "swe_bench", 
              action: "eval_script_built", 
              label: task.instance_id 
            }).pipe(
              Effect.catchAll(() => Effect.void)
            );
            
            return scriptContent;
        }).pipe(
          Effect.catchAll((cause) => 
            Effect.fail(new ScriptBuildError({ 
              message: "Failed to build evaluation script", 
              cause,
              context: { task: task.instance_id }
            }))
          )
        ),
    });
  })
);