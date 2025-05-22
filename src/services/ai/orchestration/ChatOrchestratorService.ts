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
import type { Provider as AiProvider } from "@effect/ai";
import { ConfigurationService } from "@/services/configuration";
import { TelemetryService } from "@/services/telemetry";
import { AiPlan } from "@effect/ai";

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

        // Simplified plan: Use the single active AgentLanguageModel
        const plan = AiPlan.make({
          model: Effect.succeed(activeAgentLM as AiProvider.Provider<AgentLanguageModel>),
          attempts: 3,
          schedule: Schedule.exponential("100 millis").pipe(Schedule.jittered, Schedule.recurs(2)),
          while: (err: AIProviderError | AIConfigurationError) =>
            err._tag === "AIProviderError" && err.isRetryable === true,
        });

        const streamOptions: StreamTextOptions = {
          ...options,
          prompt: JSON.stringify({ messages }),
          model: preferredProvider.modelName,
        };

        return Stream.unwrap(
          plan.pipe(
            Effect.flatMap(builtPlan => builtPlan.streamText(streamOptions)),
            Effect.tapError((err) => runTelemetry({ category: "orchestrator", action: "ai_plan_execution_error", label: (err as Error).message }))
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
