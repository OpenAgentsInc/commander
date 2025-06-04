import { Effect, pipe } from "effect";
import { TelemetryService } from "../../src/services/telemetry";
import { executeClaudeCli, ClaudeStreamMessage } from './claude-cli-executor';
import { generatePatchWithClaude as generatePatchOriginal, PatchGenerationOptions, PatchGenerationResult } from './claude-patch-generator';
import type { SWEBenchTask } from '../../src/services/swe_bench_harness/types';

/**
 * Generate a patch with Claude and emit telemetry events
 */
export function generatePatchWithClaudeTelemetry(
  task: SWEBenchTask,
  options: PatchGenerationOptions = {}
) {
  return Effect.gen(function* () {
    const telemetry = yield* TelemetryService;
    const startTime = Date.now();
    
    // Track patch generation start
    yield* telemetry.trackEvent({
      category: "swebench",
      action: "patch_generation_start",
      label: task.instance_id,
      context: {
        repo: task.repo,
        hasHints: !!task.hints_text,
        problemLength: task.problem_statement.length,
        maxRetries: options.maxRetries || 1
      },
      level: "info"
    });

    // Pass through options without modifying the streaming callback
    // (streaming telemetry would require complex Effect context handling)
    const enhancedOptions: PatchGenerationOptions = {
      ...options
    };

    // Generate patch using the original function
    const result = yield* Effect.promise(() => 
      generatePatchOriginal(task, enhancedOptions)
    );

    // Track result
    yield* telemetry.trackEvent({
      category: "swebench",
      action: "patch_generation_complete",
      label: task.instance_id,
      value: result.patch?.length || 0,
      context: {
        success: result.success,
        attempts: result.attempts,
        duration: result.duration,
        error: result.error,
        patchSize: result.patch?.length || 0,
        patchLines: result.patch?.split('\n').length || 0
      },
      level: result.success ? "info" : "warn"
    });

    // Track detailed metrics
    if (result.success && result.patch) {
      // Analyze patch content
      const lines = result.patch.split('\n');
      const additions = lines.filter(l => l.startsWith('+')).length;
      const deletions = lines.filter(l => l.startsWith('-')).length;
      const files = [...new Set(lines.filter(l => l.startsWith('diff --git')).map(l => {
        const match = l.match(/a\/(.+?) b\//);
        return match ? match[1] : 'unknown';
      }))];

      yield* telemetry.trackEvent({
        category: "swebench", 
        action: "patch_metrics",
        label: task.instance_id,
        context: {
          additions,
          deletions,
          totalChanges: additions + deletions,
          filesModified: files.length,
          files: files
        },
        level: "info"
      });
    }

    return result;
  });
}

/**
 * Wrapper function for backward compatibility that runs the Effect
 */
export async function generatePatchWithClaudeAndTelemetry(
  task: SWEBenchTask,
  options: PatchGenerationOptions = {},
  telemetryService: TelemetryService
): Promise<PatchGenerationResult> {
  const effect = pipe(
    generatePatchWithClaudeTelemetry(task, options),
    Effect.provideService(TelemetryService, telemetryService)
  );
  
  return Effect.runPromise(effect);
}