// src/services/ai/providers/claude_code/ClaudeCodeServiceLive.ts
import { Effect, Layer, Option, Stream } from "effect";
import { ConfigurationService } from "@/services/configuration";
import { ClaudeCodeService } from "./ClaudeCodeService";
import { ClaudeCliExecutor, type ClaudeExecParams, type ClaudeExecOptions } from "./ClaudeCliExecutor";
import { AiConfigurationError, AiProviderError } from "@/services/ai/core/AIError";
import { TelemetryService } from "@/services/telemetry";
import type { Readable } from "stream";

export const ClaudeCodeServiceLive = Layer.effect(
  ClaudeCodeService,
  Effect.gen(function*(_) {
    const configService = yield* _(ConfigurationService);
    const telemetry = yield* _(TelemetryService);

    const apiKey = yield* _(
      configService.getSecret("ANTHROPIC_API_KEY").pipe(
        Effect.catchTag("SecretNotFoundError", (e) =>
          Effect.fail(new AiConfigurationError({ 
            message: "ANTHROPIC_API_KEY not found for Claude Code CLI.", 
            cause: e, 
            context: { keyName: "ANTHROPIC_API_KEY"} 
          }))
        ),
        Effect.catchTag("ConfigError", (e) =>
          Effect.fail(new AiConfigurationError({ 
            message: "Error fetching ANTHROPIC_API_KEY for Claude Code CLI.", 
            cause: e 
          }))
        ),
        Effect.filterOrFail(
          (key): key is string => typeof key === "string" && key.trim() !== "" && !key.startsWith("YOUR_ANTHROPIC_API_KEY_HERE"),
          (key) => new AiConfigurationError({ 
            message: `Invalid or placeholder ANTHROPIC_API_KEY for Claude Code CLI. Key starts with: ${key ? key.substring(0,10)+'...' : 'empty'}` 
          })
        )
      )
    );

    const cliPathOpt = yield* _(
      configService.get("CLAUDE_CODE_CLI_PATH").pipe(
        Effect.map(path => path.trim() ? Option.some(path) : Option.none<string>()),
        Effect.catchTag("ConfigError", () => Effect.succeed(Option.none<string>()))
      )
    );

    const executorOpts: ClaudeExecOptions = {
      cliPath: Option.getOrUndefined(cliPathOpt),
      env: { ...process.env, ANTHROPIC_API_KEY: apiKey }, // Ensure API key is in env for the CLI
    };
    const executor = new ClaudeCliExecutor(executorOpts);

    yield* _(telemetry.trackEvent({ 
      category: "claude_code_service", 
      action: "executor_instantiated", 
      label: `CLI Path: ${Option.getOrUndefined(cliPathOpt) || 'default (PATH)'}` 
    }));

    return ClaudeCodeService.of({
      executeCommand: (params, timeout) =>
        Effect.tryPromise({
          try: () => executor.execute(params, timeout),
          catch: (e) => new AiProviderError({ 
            message: "Claude CLI command execution failed.", 
            cause: e, 
            provider: "ClaudeCode", 
            isRetryable: false 
          })
        }).pipe(
          Effect.tapError((err) => Effect.ignore(telemetry.trackEvent({ 
            category: "claude_code_service", 
            action: "execute_command_error", 
            label: err.message 
          })))
        ),

      streamCommand: (params) => {
        try {
          const readableStream = executor.executeStream({ ...params, outputFormat: 'stream-json' });
          return Stream.fromAsyncIterable<Buffer, AiProviderError>(
              readableStream as AsyncIterable<Buffer>, // Node's Readable can be treated as AsyncIterable of Buffers
              (e) => new AiProviderError({ 
                message: "Claude CLI stream command failed on iteration.", 
                cause: e, 
                provider: "ClaudeCode", 
                isRetryable: false 
              })
          ).pipe(
              Stream.decodeText(), // Decode Buffer chunks to string
              Stream.mapError(e => e instanceof AiProviderError ? e : new AiProviderError({ 
                message: "Claude CLI stream decoding error.", 
                cause: e, 
                provider: "ClaudeCode", 
                isRetryable: false
              })),
              Stream.tapError((err) => Effect.ignore(telemetry.trackEvent({ 
                category: "claude_code_service", 
                action: "stream_command_error", 
                label: err.message 
              })))
          );
        } catch (e) {
          // Catch synchronous errors from executeStream setup (e.g., if spawn fails immediately)
          const error = new AiProviderError({ 
            message: "Claude CLI stream command setup failed.", 
            cause: e, 
            provider: "ClaudeCode", 
            isRetryable: false 
          });
          Effect.runFork(telemetry.trackEvent({ 
            category: "claude_code_service", 
            action: "stream_command_setup_error", 
            label: error.message 
          }));
          return Stream.fail(error);
        }
      }
    });
  })
);