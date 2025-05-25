// src/services/ai/providers/claude_code/ClaudeCodeAgentLanguageModelLive.ts
import { Effect, Layer, Stream, Schema } from "effect";
import { AgentLanguageModel, makeAgentLanguageModel, AiResponse, AiProviderError, StreamTextOptions, GenerateTextOptions, GenerateStructuredOptions, AgentChatMessage } from "@/services/ai/core";
import { ConfigurationService } from "@/services/configuration";
import { TelemetryService } from "@/services/telemetry";
import type { ClaudeExecParams } from "./claudeCliUtils";
import { formatMessagesForClaudeCli } from "./claudeFormatters";

// Define a schema for the expected JSON structure of a single stream chunk from the CLI
// This is based on the CLI's `stream-json` output format
const ClaudeCliStreamChunkSchema = Schema.Struct({
  choices: Schema.Array(
    Schema.Struct({
      delta: Schema.Struct({
        content: Schema.optional(Schema.String),
        // tool_calls: Schema.optional(Schema.Array(Schema.Any)), // For tool use later
      }),
      // finish_reason: Schema.optional(Schema.NullishOr(Schema.String)),
    })
  ),
  // usage: Schema.optional(Schema.NullishOr(Schema.Any)),
});
type ClaudeCliStreamChunk = Schema.Schema.Type<typeof ClaudeCliStreamChunkSchema>;

// Define a schema for the expected JSON structure of a non-streaming response
const ClaudeCliCompletionResponseSchema = Schema.Struct({
    choices: Schema.Array(Schema.Struct({
        message: Schema.Struct({
            content: Schema.optional(Schema.String),
            // tool_calls: Schema.optional(Schema.Array(Schema.Any)),
        }),
    })),
});
type ClaudeCliCompletionResponse = Schema.Schema.Type<typeof ClaudeCliCompletionResponseSchema>;

// Create the implementation using Effect.gen like OllamaAgentLanguageModelLive
export const ClaudeCodeAgentLanguageModelLive = Effect.gen(function* (_) {
  const configService = yield* _(ConfigurationService);
  const telemetry = yield* _(TelemetryService);

    const defaultModelName = yield* _(
      configService.get("CLAUDE_CODE_DEFAULT_MODEL").pipe(
        Effect.orElseSucceed(() => "claude-3-opus-20240229")
      )
    );

    const parseAndMapCliJsonOutput = (rawJsonString: string, isStreamChunk: boolean = false): Effect.Effect<AiResponse, AiProviderError, never> => {
        return Effect.try({
            try: () => JSON.parse(rawJsonString),
            catch: (e) => new AiProviderError({ message: "CLI output is not valid JSON", cause: e, provider: "ClaudeCode", isRetryable: false })
        }).pipe(
            Effect.flatMap((parsedJson: any) => {
              // Extract content directly without strict schema validation for now
              try {
                const choice = parsedJson?.choices?.[0];
                const textContent = choice?.delta?.content || choice?.message?.content || "";
                return Effect.succeed(AiResponse.fromSimple({ text: textContent }));
              } catch (e) {
                return Effect.fail(new AiProviderError({ message: "Failed to extract content from CLI JSON", cause: e, provider: "ClaudeCode", isRetryable: false }));
              }
            })
        );
    };

  // Create our AgentLanguageModel implementation using makeAgentLanguageModel
  return makeAgentLanguageModel({
      streamText: (options: StreamTextOptions) => {
        const modelToUse = options.model || defaultModelName;
        const parsedMessages: AgentChatMessage[] = JSON.parse(options.prompt).messages;
        const cliPrompt = formatMessagesForClaudeCli(parsedMessages);

        const cliParams: ClaudeExecParams = {
          prompt: cliPrompt,
          outputFormat: 'stream-json',
          model: modelToUse,
          temperature: options.temperature,
          max_tokens: options.maxTokens,
        };

        const electronAPI = (window as any).electronAPI;
        if (!electronAPI?.claudeCode?.streamChat) {
            return Stream.fail(new AiProviderError({ message: "Claude Code IPC bridge (streamChat) not available.", provider: "ClaudeCode", isRetryable: false }));
        }
        
        Effect.runFork(telemetry.trackEvent({ 
          category: "claude_code_provider", 
          action: "stream_text_start", 
          label: modelToUse, 
          value: `Prompt length: ${cliPrompt.length}` 
        }));

        return Stream.async<AiResponse, AiProviderError>(emit => {
          const cancelIPC = electronAPI.claudeCode.streamChat(
            cliParams,
            (rawChunkString: string) => { // IPC sends one JSON object string per chunk
              if (rawChunkString.trim() === "[DONE]") { // Check for stream end marker if CLI uses it
                emit.end();
                return;
              }
              Effect.runFork(
                  parseAndMapCliJsonOutput(rawChunkString, true).pipe(
                      Effect.tap((aiResponseChunk) => Effect.sync(() => emit.single(aiResponseChunk))),
                      Effect.catchAll((err: any) => {
                          Effect.runFork(telemetry.trackEvent({ category: "claude_code_provider", action: "stream_chunk_parse_error", value: err?.message || String(err)}));
                          // Optionally emit.fail(err) if critical
                          return Effect.void;
                      })
                  )
              );
            },
            () => { // onDone
              Effect.runFork(telemetry.trackEvent({ category: "claude_code_provider", action: "stream_text_done", label: modelToUse }));
              emit.end(); 
            },
            (err) => { // onError
              Effect.runFork(telemetry.trackEvent({ category: "claude_code_provider", action: "stream_text_error_ipc", label: modelToUse, value: err?.message || String(err) }));
              emit.fail(new AiProviderError({ message: `Claude Code CLI stream error: ${err?.message || String(err)}`, cause: err, provider: "ClaudeCode", isRetryable: false }));
              emit.end();
            }
          );
          return Effect.sync(() => { 
            Effect.runFork(telemetry.trackEvent({ category: "claude_code_provider", action: "stream_text_cancel_requested", label: modelToUse })); 
            cancelIPC(); 
          });
        });
      },

      generateText: (options: GenerateTextOptions) => Effect.gen(function*(_) {
         const modelToUse = options.model || defaultModelName;
         const parsedMessages: AgentChatMessage[] = JSON.parse(options.prompt).messages;
         const cliPrompt = formatMessagesForClaudeCli(parsedMessages);

         const cliParams: ClaudeExecParams = {
            prompt: cliPrompt,
            outputFormat: 'json',
            model: modelToUse,
            temperature: options.temperature,
            max_tokens: options.maxTokens,
         };
         
         const electronAPI = (window as any).electronAPI;
         if (!electronAPI?.claudeCode?.chatCompletion) {
            return yield* _(Effect.fail(new AiProviderError({ message: "Claude Code IPC bridge (chatCompletion) not available.", provider: "ClaudeCode", isRetryable: false })));
         }
         
         Effect.runFork(telemetry.trackEvent({ category: "claude_code_provider", action: "generate_text_start", label: modelToUse, value: `Prompt length: ${cliPrompt.length}` }));

         const rawCliResponse = yield* _(Effect.tryPromise({
           try: () => electronAPI.claudeCode.chatCompletion(cliParams),
           catch: (err) => new AiProviderError({ message: "Claude Code CLI chat error (IPC/Promise)", cause: err, provider: "ClaudeCode", isRetryable: false })
         }));

         if ((rawCliResponse as any).__error) {
           Effect.runFork(telemetry.trackEvent({ category: "claude_code_provider", action: "generate_text_error_ipc_serialized", label: modelToUse, value: (rawCliResponse as any).message }));
           return yield* _(Effect.fail(new AiProviderError({ message: `Claude Code CLI error from main: ${(rawCliResponse as any).message}`, cause: rawCliResponse, provider: "ClaudeCode", isRetryable: false })));
         }

         const aiResponse = yield* _(parseAndMapCliJsonOutput(rawCliResponse as string, false));
         Effect.runFork(telemetry.trackEvent({ category: "claude_code_provider", action: "generate_text_success", label: modelToUse }));
         return aiResponse;
      }),

      generateStructured: (options: GenerateStructuredOptions) => Effect.fail(
        new AiProviderError({ message: "generateStructured not implemented for ClaudeCode", provider: "ClaudeCode", isRetryable: false })
      )
  });
});

// Create the Layer by providing the implementation
export const ClaudeCodeAgentLanguageModelLiveLayer = Layer.effect(
  AgentLanguageModel.Tag,
  ClaudeCodeAgentLanguageModelLive
);