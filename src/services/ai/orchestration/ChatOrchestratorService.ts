import { Effect, Context, Layer, Console } from "effect";
import * as Stream from "effect/Stream";
import { TelemetryService } from "@/services/telemetry";
import { ConfigurationService } from "@/services/configuration";
import { ProviderFactoryService } from "@/services/ai/providers/ProviderFactoryService";
import { AgentChatMessage } from "@/services/ai/core/AgentChatMessage";
import { AiResponse } from "@/services/ai/core/AiResponse";
import { AiProviderError, AiConfigurationError } from "@/services/ai/core/AIError";
import { StreamTextOptions, GenerateTextOptions } from "@/services/ai/core/AgentLanguageModel";

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
  }): Stream.Stream<AiResponse, AiProviderError | AiConfigurationError, any>;
  generateConversationResponse(params: {
    messages: AgentChatMessage[];
    preferredProvider: PreferredProviderConfig;
    options?: Partial<Omit<GenerateTextOptions, "prompt">>;
  }): Effect.Effect<string, AiProviderError | AiConfigurationError, any>;
}

export const ChatOrchestratorService = Context.GenericTag<ChatOrchestratorService>("ChatOrchestratorService");

export const ChatOrchestratorServiceLive = Layer.succeed(
  ChatOrchestratorService,
  ChatOrchestratorService.of({
    _tag: "ChatOrchestratorService",
    
    streamConversation: (params) =>
      Stream.unwrapScoped(
        Effect.gen(function* (_) {
          const { messages, preferredProvider, options = {} } = params;
          
          // Resolve services inside the method
          const telemetry = yield* _(TelemetryService);
          const providerFactory = yield* _(ProviderFactoryService);
          
          // Track start of conversation
          yield* _(
            telemetry.trackEvent({
              category: "orchestrator",
              action: "stream_conversation_start",
              label: preferredProvider.key
            }).pipe(Effect.catchAll(() => Effect.void))
          );
          
          // Create provider using factory
          const provider = yield* _(
            providerFactory.createProvider(
              preferredProvider.key,
              preferredProvider.modelName
            )
          );
          
          // Format messages for the provider
          const formattedMessages = messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }));
          
          const prompt = JSON.stringify({ messages: formattedMessages });
          
          // Stream from the provider
          const stream = provider.streamText({
            ...options,
            prompt,
            model: preferredProvider.modelName || options.model
          });
          
          // Track completion
          return stream.pipe(
            Stream.tap(() =>
              Effect.gen(function* (_) {
                const telemetry = yield* _(TelemetryService);
                yield* _(
                  telemetry.trackEvent({
                    category: "orchestrator",
                    action: "stream_conversation_chunk",
                    label: preferredProvider.key
                  }).pipe(Effect.catchAll(() => Effect.void))
                );
              })
            ),
            Stream.onDone(() =>
              Effect.gen(function* (_) {
                const telemetry = yield* _(TelemetryService);
                yield* _(
                  telemetry.trackEvent({
                    category: "orchestrator",
                    action: "stream_conversation_complete",
                    label: preferredProvider.key
                  }).pipe(Effect.catchAll(() => Effect.void))
                );
              })
            )
          );
        })
      ) as Stream.Stream<AiResponse, AiProviderError | AiConfigurationError, any>,
    
    generateConversationResponse: (params) =>
      Effect.gen(function* (_) {
        const { messages, preferredProvider, options = {} } = params;
        
        // Resolve services inside the method
        const telemetry = yield* _(TelemetryService);
        const providerFactory = yield* _(ProviderFactoryService);
        
        yield* _(
          telemetry.trackEvent({
            category: "orchestrator",
            action: "generate_conversation_start",
            label: preferredProvider.key
          }).pipe(Effect.catchAll(() => Effect.void))
        );
        
        // Create provider using factory
        const provider = yield* _(
          providerFactory.createProvider(
            preferredProvider.key,
            preferredProvider.modelName
          )
        );
        
        // Format messages for the provider
        const formattedMessages = messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }));
        
        const prompt = JSON.stringify({ messages: formattedMessages });
        
        // Generate response
        const response = yield* _(
          provider.generateText({
            ...options,
            prompt,
            model: preferredProvider.modelName || options.model
          })
        );
        
        yield* _(
          telemetry.trackEvent({
            category: "orchestrator",
            action: "generate_conversation_complete",
            label: preferredProvider.key
          }).pipe(Effect.catchAll(() => Effect.void))
        );
        
        return response.text;
      })
  })
);