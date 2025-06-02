import { Effect, Layer, Stream, Context } from "effect";
import { ChatOrchestratorService } from "./ChatOrchestratorService";
import { TelemetryService } from "@/services/telemetry";
import { ConfigurationService } from "@/services/configuration";
import { 
  AiProviderError, 
  AiConfigurationError,
  AgentLanguageModel
} from "@/services/ai/core";
import { ClaudeCodeNodeProviderLive } from "@/services/ai/providers/claude_code/ClaudeCodeNodeProvider";
import { ClaudeCliExecutorServiceLive } from "@/services/claude-cli";

/**
 * Simplified ChatOrchestratorService for CLI environments
 * Only supports claude_code provider with direct execution
 */
export const ChatOrchestratorServiceCliLive = Layer.effect(
  ChatOrchestratorService,
  Effect.gen(function* () {
    const telemetry = yield* TelemetryService;
    const configService = yield* ConfigurationService;
    
    // Build the Claude provider once during initialization
    const claudeProviderLayer = ClaudeCodeNodeProviderLive.pipe(
      Layer.provide(ClaudeCliExecutorServiceLive)
    );
    
    // Get the Claude provider instance
    const claudeProvider = yield* Layer.build(claudeProviderLayer).pipe(
      Effect.map(context => Context.get(context, AgentLanguageModel.Tag)),
      Effect.scoped
    );
    
    const runTelemetryEffect = (event: any) => 
      telemetry.trackEvent(event).pipe(Effect.ignoreLogged);
    
    return {
      _tag: "ChatOrchestratorService" as const,
      
      streamConversation: ({ messages, preferredProvider, options }) => {
        Effect.runFork(runTelemetryEffect({ 
          category: "orchestrator", 
          action: "stream_conversation_start", 
          label: preferredProvider.key 
        }));
        
        if (preferredProvider.key !== "claude_code") {
          return Stream.fail(new AiConfigurationError({ 
            message: `CLI orchestrator only supports claude_code provider, got: ${preferredProvider.key}` 
          }));
        }
        
        const streamOptions = {
          ...options,
          prompt: JSON.stringify({ messages }),
          ...(preferredProvider.modelName ? { model: preferredProvider.modelName } : {}),
        };
        
        return claudeProvider.streamText(streamOptions);
      },
      
      generateConversationResponse: ({ messages, preferredProvider, options }) => {
        Effect.runFork(runTelemetryEffect({ 
          category: "orchestrator", 
          action: "generate_conversation_start", 
          label: preferredProvider.key 
        }));
        
        if (preferredProvider.key !== "claude_code") {
          return Effect.fail(new AiConfigurationError({ 
            message: `CLI orchestrator only supports claude_code provider, got: ${preferredProvider.key}` 
          }));
        }
        
        const generateOptions = {
          ...options,
          prompt: JSON.stringify({ messages }),
          ...(preferredProvider.modelName ? { model: preferredProvider.modelName } : {}),
        };
        
        return claudeProvider.generateText(generateOptions).pipe(
          Effect.map(aiResponse => aiResponse.text)
        );
      },
    };
  })
);