import { Effect, Layer, pipe, Stream } from "effect";
import { AgentPatchGeneratorService, AgentPatchGenerationError } from "./AgentPatchGeneratorService";
import type { SWEBenchTask } from "./types";
import { ChatOrchestratorService } from "@/services/ai/orchestration";
import { ConfigurationService } from "@/services/configuration";
import { TelemetryService } from "@/services/telemetry";
import type { AgentChatMessage } from "@/services/ai/core";

export const AgentPatchGeneratorServiceLive = Layer.effect(
  AgentPatchGeneratorService,
  Effect.gen(function* () {
    const orchestrator = yield* ChatOrchestratorService;
    const config = yield* ConfigurationService;
    const telemetry = yield* TelemetryService;

    return AgentPatchGeneratorService.of({
      generatePatch: (task, repoPathOnHost, preferredProviderKey) =>
        Effect.gen(function* () {
          // Track telemetry
          yield* telemetry.trackEvent({
            category: "swe_bench",
            action: "agent_patch_generation_start",
            label: task.instance_id,
            context: {
              provider: preferredProviderKey,
              repo: task.repo,
              repoPath: repoPathOnHost
            }
          }).pipe(Effect.catchAll(() => Effect.void));

          // Get the default model for the provider
          // For claude_code, don't pass a model - let the CLI use its defaults
          const modelConfigKey = `${preferredProviderKey.toUpperCase()}_DEFAULT_MODEL`;
          const defaultModel = preferredProviderKey === 'claude_code' 
            ? undefined 
            : yield* config.get(modelConfigKey).pipe(
                Effect.orElse(() => Effect.succeed("claude-3-5-sonnet-20241022"))
              );

          // Construct the initial prompt
          const systemPrompt = "You are an expert software developer. You analyze code issues and create precise patches to fix them.";
          
          const userPrompt = `You are an AI coding assistant. Your task is to fix a bug in a software repository.

Problem Description:
${task.problem_statement}

Hints (if any):
${task.hints_text || "No specific hints provided."}

The relevant codebase is located on the local filesystem at:
${repoPathOnHost}

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

          // Prepare initial messages
          const initialMessages: AgentChatMessage[] = [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ];

          // Stream conversation with the agent
          let finalAssistantContent = "";
          
          yield* pipe(
            orchestrator.streamConversation({
              messages: initialMessages,
              preferredProvider: {
                key: preferredProviderKey,
                modelName: defaultModel
              }
            }),
            Stream.tap(response => 
              Effect.sync(() => {
                if (response.text) {
                  finalAssistantContent += response.text;
                }
              })
            ),
            Stream.runDrain
          );

          // Extract patch from the response
          const diffRegex = /```diff\s*([\s\S]*?)\s*```/;
          const match = finalAssistantContent.match(diffRegex);

          if (!match || !match[1]) {
            yield* telemetry.trackEvent({
              category: "swe_bench",
              action: "agent_patch_generation_failed",
              label: task.instance_id,
              context: {
                provider: preferredProviderKey,
                reason: "no_patch_found",
                responseLength: finalAssistantContent.length
              }
            }).pipe(Effect.catchAll(() => Effect.void));

            return yield* Effect.fail(new AgentPatchGenerationError({
              message: "No patch found in agent output",
              context: {
                taskId: task.instance_id,
                provider: preferredProviderKey,
                responsePreview: finalAssistantContent.substring(0, 200)
              }
            }));
          }

          const extractedPatch = match[1].trim();

          // Track success
          yield* telemetry.trackEvent({
            category: "swe_bench",
            action: "agent_patch_generation_success",
            label: task.instance_id,
            context: {
              provider: preferredProviderKey,
              patchLength: extractedPatch.length
            }
          }).pipe(Effect.catchAll(() => Effect.void));

          return extractedPatch;
        })
    });
  })
);