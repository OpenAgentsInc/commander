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
  }): Stream.Stream<AiResponse, AiProviderError | AiConfigurationError>;
  generateConversationResponse(params: {
    messages: AgentChatMessage[];
    preferredProvider: PreferredProviderConfig;
    options?: Partial<Omit<GenerateTextOptions, "prompt">>;
  }): Effect.Effect<string, AiProviderError | AiConfigurationError>;
}

export const ChatOrchestratorService = Context.GenericTag<ChatOrchestratorService>("ChatOrchestratorService");

export const ChatOrchestratorServiceLive = Layer.effect(
  ChatOrchestratorService,
  Effect.gen(function* (_) {
    const telemetry = yield* _(TelemetryService);
    const config = yield* _(ConfigurationService);
    const providerFactory = yield* _(ProviderFactoryService);
    
    const runTelemetry = (telemetryEffect: Effect.Effect<void, Error>) => {
      Effect.runFork(telemetryEffect.pipe(
        Effect.catchAll((error) =>
          Console.error(`Telemetry error in ChatOrchestratorService: ${error.message}`)
        )
      ));
    };
    
    const service: ChatOrchestratorService = {
      _tag: "ChatOrchestratorService",
      
      streamConversation: (params) =>
        Stream.unwrapScoped(
          Effect.gen(function* (_) {
            const { messages, preferredProvider, options = {} } = params;
            
            runTelemetry(telemetry.trackEvent({
              category: "orchestrator",
              action: "stream_conversation_start",
              label: preferredProvider.key
            }));
            
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
                Effect.sync(() =>
                  runTelemetry(telemetry.trackEvent({
                    category: "orchestrator",
                    action: "stream_conversation_chunk",
                    label: preferredProvider.key
                  }))
                )
              ),
              Stream.onDone(() =>
                Effect.sync(() =>
                  runTelemetry(telemetry.trackEvent({
                    category: "orchestrator",
                    action: "stream_conversation_complete",
                    label: preferredProvider.key
                  }))
                )
              )
            );
          })
        ),
      
      generateConversationResponse: (params) =>
        Effect.gen(function* (_) {
          const { messages, preferredProvider, options = {} } = params;
          
          runTelemetry(telemetry.trackEvent({
            category: "orchestrator",
            action: "generate_conversation_start",
            label: preferredProvider.key
          }));
          
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
          
          runTelemetry(telemetry.trackEvent({
            category: "orchestrator",
            action: "generate_conversation_complete",
            label: preferredProvider.key
          }));
          
          return response.text;
        })
    };
    
    return service;
  })
);