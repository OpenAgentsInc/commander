import { Effect, Layer, Schema } from "effect";
import { FileSystem } from "@effect/platform/FileSystem";
import path from "path";
import { SWEBenchHarnessService, EvaluateTaskError, PatchSource } from "./SWEBenchHarnessService";
import { SWEBenchTaskService } from "./SWEBenchTaskService";
import { SWEBenchEvaluationScriptService } from "./SWEBenchEvaluationScriptService";
import { SWEBenchLifecycleService } from "./SWEBenchLifecycleService";
import { AgentPatchGeneratorService } from "./AgentPatchGeneratorService";
import { TelemetryService } from "@/services/telemetry";
import type { ContainerContext, EvaluationReport, EvaluationResult } from "./types";
import { HarnessError, ScriptBuildError, LifecycleSetupError, LifecycleEvalError, AgentPatchGenerationError } from "./errors";

export const SWEBenchHarnessServiceLive = Layer.effect(
  SWEBenchHarnessService,
  Effect.gen(function* (_) {
    const taskService = yield* SWEBenchTaskService;
    const scriptService = yield* SWEBenchEvaluationScriptService;
    const lifecycleService = yield* SWEBenchLifecycleService;
    const agentPatchGenerator = yield* AgentPatchGeneratorService;
    const telemetry = yield* TelemetryService;

    const patchFileName = "patch.diff"; // Standard name for the patch file in the container

    return SWEBenchHarnessService.of({
      evaluateTask: (instanceId, patchSource) =>
        Effect.gen(function* (_) {
          const startTime = Date.now();
          yield* telemetry.trackEvent({ category: "swe_bench_harness", action: "evaluate_task_start", label: instanceId }).pipe(
            Effect.catchAll(() => Effect.void)
          );

          const task = yield* taskService.getTask(instanceId);

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