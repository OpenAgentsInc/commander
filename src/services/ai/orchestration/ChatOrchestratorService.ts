import { Context, Effect, Stream, Layer, Schedule } from "effect";
import {
  AgentChatMessage,
  AiTextChunk,
  AIProviderError,
  AIConfigurationError,
  AgentLanguageModel,
  GenerateTextOptions,
  StreamTextOptions,
} from "@/services/ai/core";
import { ConfigurationService } from "@/services/configuration";
import { TelemetryService } from "@/services/telemetry";
import { OpenAiLanguageModel } from "@effect/ai-openai";
import type { AiModel } from "@effect/ai/AiModel";

export interface PreferredProviderConfig {
  key: string;
  modelName?: string;
}

export interface ChatOrchestratorService {
  readonly _tag: "ChatOrchestratorService";
  streamConversation(params: {
    messages: AgentChatMessage[];
    preferredProvider: PreferredProviderConfig;
    options?: Partial<Omit<StreamTextOptions, "prompt">>;
  }): Stream.Stream<AiTextChunk, AIProviderError | AIConfigurationError>;
  generateConversationResponse(params: {
    messages: AgentChatMessage[];
    preferredProvider: PreferredProviderConfig;
    options?: Partial<Omit<GenerateTextOptions, "prompt">>;
  }): Effect.Effect<string, AIProviderError | AIConfigurationError>;
}

export const ChatOrchestratorService = Context.GenericTag<ChatOrchestratorService>("ChatOrchestratorService");

export const ChatOrchestratorServiceLive = Layer.effect(
  ChatOrchestratorService,
  Effect.gen(function* (_) {
    const telemetry = yield* _(TelemetryService);
    const activeAgentLM = yield* _(AgentLanguageModel);

    const runTelemetry = (event: any) => Effect.runFork(telemetry.trackEvent(event).pipe(Effect.ignoreLogged));

    return ChatOrchestratorService.of({
      _tag: "ChatOrchestratorService",
      streamConversation: ({ messages, preferredProvider, options }) => {
        runTelemetry({ category: "orchestrator", action: "stream_conversation_start", label: preferredProvider.key });

        // Create an AiModel that will provide AgentLanguageModel
        const aiModel = OpenAiLanguageModel.model(preferredProvider.modelName || "gpt-4o");

        // Build a plan for retrying the model with exponential backoff
        const plan = Effect.gen(function* (_) {
          // Build the AiModel into a Provider
          const provider = yield* _(aiModel);
          let attempts = 3;
          let result = null;

          while (attempts > 0) {
            try {
              const streamOptions: StreamTextOptions = {
                ...options,
                prompt: JSON.stringify({ messages }),
                model: preferredProvider.modelName,
              };

              result = yield* _(provider.streamText(streamOptions));
              break;
            } catch (err) {
              if (attempts === 1 || !(err instanceof AIProviderError) || !err.isRetryable) {
                throw err;
              }
              attempts--;
              yield* _(Effect.sleep(Schedule.exponential("100 millis")));
            }
          }
          return result!;
        });

        return Stream.unwrap(
          plan.pipe(
            Effect.tapError((err) => runTelemetry({
              category: "orchestrator",
              action: "ai_plan_execution_error",
              label: (err as Error).message
            }))
          )
        );
      },
      generateConversationResponse: ({ messages, preferredProvider, options }) => {
        runTelemetry({ category: "orchestrator", action: "generate_conversation_start", label: preferredProvider.key });

        const generateOptions: GenerateTextOptions = {
          ...options,
          prompt: JSON.stringify({ messages }),
          model: preferredProvider.modelName,
        };

        return activeAgentLM.generateText(generateOptions).pipe(
          Effect.map(aiResponse => aiResponse.text),
          Effect.tapError((err) => runTelemetry({ category: "orchestrator", action: "generate_conversation_error", label: (err as Error).message }))
        );
      },
    });
  })
);
