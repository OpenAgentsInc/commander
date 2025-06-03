import { Effect, Layer, Schema, Stream, Chunk } from "effect";
import { FileSystem } from "@effect/platform/FileSystem";
import path from "path";
import { SWEBenchHarnessService, EvaluateTaskError, PatchSource } from "./SWEBenchHarnessService";
import { SWEBenchTaskService } from "./SWEBenchTaskService";
import { SWEBenchEvaluationScriptService } from "./SWEBenchEvaluationScriptService";
import { SWEBenchLifecycleService } from "./SWEBenchLifecycleService";
import { AgentPatchGeneratorService } from "./AgentPatchGeneratorService";
import { TelemetryService } from "@/services/telemetry";
import { SWEBenchPythonBridgeService, SWEBenchPrediction } from "./SWEBenchPythonBridgeService";
import type { ContainerContext, EvaluationReport, EvaluationResult } from "./types";
import { HarnessError, ScriptBuildError, LifecycleSetupError, LifecycleEvalError, AgentPatchGenerationError } from "./errors";

// Feature flag to use official SWE-bench
const USE_OFFICIAL_SWEBENCH = process.env.USE_OFFICIAL_SWEBENCH === "true";

export const SWEBenchHarnessServiceLive = Layer.effect(
  SWEBenchHarnessService,
  Effect.gen(function* (_) {
    const taskService = yield* SWEBenchTaskService;
    const scriptService = yield* SWEBenchEvaluationScriptService;
    const lifecycleService = yield* SWEBenchLifecycleService;
    const agentPatchGenerator = yield* AgentPatchGeneratorService;
    const telemetry = yield* TelemetryService;
    const pythonBridge = yield* SWEBenchPythonBridgeService;

    const patchFileName = "patch.diff"; // Standard name for the patch file in the container

    return SWEBenchHarnessService.of({
      evaluateTask: (instanceId, patchSource) =>
        Effect.gen(function* (_) {
          const startTime = Date.now();
          yield* telemetry.trackEvent({ category: "swe_bench_harness", action: "evaluate_task_start", label: instanceId }).pipe(
            Effect.catchAll(() => Effect.void)
          );

          const task = yield* taskService.getTask(instanceId);

          // Use official SWE-bench if feature flag is enabled
          if (USE_OFFICIAL_SWEBENCH) {
            yield* telemetry.trackEvent({ 
              category: "swe_bench_harness", 
              action: "using_official_swebench", 
              label: instanceId 
            }).pipe(Effect.catchAll(() => Effect.void));

            // Initialize Python bridge if needed
            const initialized = yield* pythonBridge.isInitialized();
            if (!initialized) {
              yield* pythonBridge.initialize();
            }

            // Generate patch based on source
            let patch: string;
            switch (patchSource.type) {
              case "gold":
                patch = task.patch || "";
                break;
              case "empty":
                patch = "";
                break;
              case "content":
                patch = patchSource.content;
                break;
              case "agent_generated":
                patch = yield* agentPatchGenerator.generatePatch(
                  task,
                  "", // repo path not needed for agent generation
                  patchSource.providerKey
                );
                break;
            }

            // Format prediction for SWE-bench
            const prediction: SWEBenchPrediction = {
              instance_id: instanceId,
              model_name_or_path: "commander-claude-code",
              model_patch: patch
            };

            // Run evaluation via Python bridge
            const stream = pythonBridge.runEvaluation([prediction], {
              max_workers: 1,
              timeout: 1800,
              instance_ids: [instanceId]
            });

            // Collect all messages
            const messages = yield* stream.pipe(
              Stream.runCollect,
              Effect.map(Chunk.toArray)
            );

            // Find completion message
            const completeMsg = messages.find(m => m.type === "complete");
            const errorMsg = messages.find(m => m.type === "error");

            if (errorMsg) {
              return yield* Effect.fail(new HarnessError({
                message: `Python bridge error: ${errorMsg.data.message}`,
                instanceId,
                cause: errorMsg.data
              }));
            }

            if (!completeMsg) {
              return yield* Effect.fail(new HarnessError({
                message: "Evaluation did not complete successfully",
                instanceId
              }));
            }

            // Extract result for this instance
            const instanceResult = completeMsg.data.results[instanceId];
            if (!instanceResult) {
              return yield* Effect.fail(new HarnessError({
                message: "No result found for instance",
                instanceId
              }));
            }

            // Format result to match our interface
            const durationMs = Date.now() - startTime;
            const result: EvaluationResult = {
              instance_id: instanceId,
              report: {
                instance_id: instanceId,
                resolved: instanceResult.resolved || false,
                patch_applied_successfully: true, // Assume true if we got results
                tests_passed: instanceResult.resolved || false,
                test_output_log_path: instanceResult.test_output_path,
                FAIL_TO_PASS: instanceResult.FAIL_TO_PASS,
                PASS_TO_PASS: instanceResult.PASS_TO_PASS
              },
              duration_ms: durationMs,
              patch_source_type: patchSource.type,
              generated_patch_content: patchSource.type === "agent_generated" ? patch : undefined
            };

            yield* telemetry.trackEvent({ 
              category: "swe_bench_harness", 
              action: "evaluate_task_success", 
              label: instanceId, 
              value: JSON.stringify({ 
                resolved: result.report.resolved, 
                duration: durationMs,
                official: true 
              }) 
            }).pipe(Effect.catchAll(() => Effect.void));

            return result;
          }

          // Existing mock implementation follows...

          // Define the acquire, use, and release logic for the container
          const evaluationPipeline = (containerContext: ContainerContext) =>
            Effect.gen(function* (_) {
              yield* telemetry.trackEvent({ category: "swe_bench_harness", action: "container_setup_success", label: instanceId, value: containerContext.containerId }).pipe(
                Effect.catchAll(() => Effect.void)
              );

              // Determine patch content based on source
              let patchContentToApply: string;
              switch (patchSource.type) {
                case "gold":
                  patchContentToApply = task.patch || "";
                  if (!task.patch) {
                    yield* telemetry.trackEvent({ 
                      category: "swe_bench_harness", 
                      action: "gold_patch_missing", 
                      label: instanceId 
                    }).pipe(Effect.catchAll(() => Effect.void));
                  }
                  break;
                case "empty":
                  patchContentToApply = "";
                  break;
                case "content":
                  patchContentToApply = patchSource.content;
                  break;
                case "agent_generated":
                  const hostRepoPath = path.join(containerContext.hostEvalDir, task.repo.split('/').pop()!);
                  patchContentToApply = yield* agentPatchGenerator.generatePatch(
                    task,
                    hostRepoPath,
                    patchSource.providerKey
                  );
                  break;
              }

              // Prepare test patch file name if test patch exists
              const testPatchFileName = task.test_patch ? "test_patch.diff" : undefined;
              
              const evalScriptContent = yield* scriptService.buildEvalScript(
                task,
                patchFileName,
                containerContext.containerEvalDir,
                containerContext.containerRepoPath,
                testPatchFileName
              );

              const report: EvaluationReport = yield* lifecycleService.runEvaluationInContainer(
                containerContext,
                evalScriptContent,
                patchContentToApply,
                patchFileName, // Pass the filename to runEvaluationInContainer
                task.test_patch // Pass test patch content if available
              );

              const durationMs = Date.now() - startTime;
              const result: EvaluationResult = {
                instance_id: instanceId,
                report: report,
                // Logs might be part of the report.test_output_log_path or from execInContainer in future
                duration_ms: durationMs,
                patch_source_type: patchSource.type,
                generated_patch_content: patchSource.type === "agent_generated" ? patchContentToApply : undefined,
              };

              yield* telemetry.trackEvent({ category: "swe_bench_harness", action: "evaluate_task_success", label: instanceId, value: JSON.stringify({ resolved: report.resolved, duration: durationMs }) }).pipe(
                Effect.catchAll(() => Effect.void)
              );
              return result;
            });

          return yield* Effect.acquireUseRelease(
            lifecycleService.setupContainerForTask(task).pipe(
              Effect.tapError((err) => telemetry.trackEvent({ category: "swe_bench_harness", action: "container_setup_error", label: instanceId, value: (err as Error).message || String(err) }).pipe(Effect.catchAll(() => Effect.void)))
            ),
            evaluationPipeline, // This is the 'use' part
            (containerContext, exit) => // This is the 'release' part
              lifecycleService.cleanupContainerResources(containerContext).pipe(
                Effect.tapError((err) => telemetry.trackEvent({ category: "swe_bench_harness", action: "container_cleanup_error", label: instanceId, value: (err as Error).message || String(err) }).pipe(Effect.catchAll(() => Effect.void))),
                Effect.catchAll(() => Effect.void) // Ensure cleanup errors don't mask evaluation errors
              )
          ).pipe(
             Effect.tapError((err) => 
                // Log unexpected errors before mapping
                (err instanceof HarnessError || err instanceof LifecycleSetupError || err instanceof LifecycleEvalError || err instanceof ScriptBuildError || err instanceof AgentPatchGenerationError)
                  ? Effect.void
                  : telemetry.trackEvent({ 
                      category: "swe_bench:harness", 
                      action: "evaluation_error", 
                      label: instanceId,
                      level: "error",
                      context: {
                        error: err instanceof Error ? err.message : String(err),
                        errorType: err?.constructor?.name || 'UnknownError',
                        stack: err instanceof Error ? err.stack : undefined
                      }
                    }).pipe(Effect.catchAll(() => Effect.void))
             ),
             Effect.mapError((err): EvaluateTaskError => {
                if (err instanceof HarnessError || err instanceof LifecycleSetupError || err instanceof LifecycleEvalError || err instanceof ScriptBuildError || err instanceof AgentPatchGenerationError) {
                  return err;
                }
                // Wrap other known errors or create a generic HarnessError
                return new HarnessError({ message: `Evaluation failed for ${instanceId}`, cause: err, instanceId });
             })
          );
        })
    });
  })
);