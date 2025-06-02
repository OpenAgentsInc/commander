import { Effect, Layer, Context } from "effect";
import { ChatOrchestratorService } from "./ChatOrchestratorService";
import { TelemetryService } from "@/services/telemetry";
import { ConfigurationService } from "@/services/configuration";
import { 
  AiProviderError, 
  AiConfigurationError,
  AgentLanguageModel
} from "@/services/ai/core";

/**
 * Simplified ChatOrchestratorService for CLI environments
 * Only supports claude_code provider with direct execution
 */
export const ChatOrchestratorServiceCliLive = Layer.effect(
  ChatOrchestratorService,
  Effect.gen(function* () {
    const telemetry = yield* TelemetryService;
    const configService = yield* ConfigurationService;
    
    const runTelemetryEffect = (event: any) => 
      telemetry.trackEvent(event).pipe(Effect.ignoreLogged);
    
    // Helper to get Claude Code provider for CLI
    const getProviderLanguageModel = (providerKey: string, modelName?: string) => 
      Effect.gen(function* () {
        yield* runTelemetryEffect({ 
          category: "orchestrator", 
          action: "get_provider_model_start", 
          label: providerKey 
        });
        
        if (providerKey !== "claude_code") {
          return yield* Effect.fail(new AiConfigurationError({ 
            message: `CLI orchestrator only supports claude_code provider, got: ${providerKey}` 
          }));
        }
        
        // Dynamically import Claude Code Node provider
        const claudeModule: any = yield* Effect.tryPromise({
          try: () => import("@/services/ai/providers/claude_code" as any),
          catch: (error) => new AiProviderError({
            message: `Failed to load Claude Code provider: ${error}`,
            cause: error,
            isRetryable: false,
            provider: "claude_code"
          })
        });
        const { ClaudeCodeNodeProviderLive } = claudeModule;
        
        // Dynamically import Claude CLI executor
        const cliModule: any = yield* Effect.tryPromise({
          try: () => import("@/services/claude-cli" as any),
          catch: (error) => new AiProviderError({
            message: `Failed to load Claude CLI executor: ${error}`,
            cause: error,
            isRetryable: false,
            provider: "claude_code"
          })
        });
        const { ClaudeCliExecutorServiceLive } = cliModule;
        
        // Build Claude Code Node provider with CLI executor
        const claudeNodeLayer = ClaudeCodeNodeProviderLive.pipe(
          Layer.provide(ClaudeCliExecutorServiceLive)
        );
        
        const claudeCodeAgentLM: AgentLanguageModel = yield* Layer.build(claudeNodeLayer).pipe(
          Effect.map((context) =>
            Context.get(context, AgentLanguageModel.Tag)
          ),
          Effect.scoped,
          Effect.mapError((error) => new AiProviderError({
            message: `Failed to build Claude Code Node provider: ${error}`,
            cause: error,
            isRetryable: false,
            provider: "claude_code"
          }))
        );
        
        yield* runTelemetryEffect({ 
          category: "orchestrator", 
          action: "get_provider_model_success_claude_code_cli", 
          label: providerKey 
        });
        
        return claudeCodeAgentLM;
      });
    
    return {
      _tag: "ChatOrchestratorService" as const,
      
      streamConversation: ({ messages, preferredProvider, options }) => {
        Effect.runFork(runTelemetryEffect({ 
          category: "orchestrator", 
          action: "stream_conversation_start", 
          label: preferredProvider.key 
        }));
        
        return Effect.stream(
          getProviderLanguageModel(preferredProvider.key, preferredProvider.modelName).pipe(
            Effect.map(agentLM => {
              const streamOptions = {
                ...options,
                prompt: JSON.stringify({ messages }),
                ...(preferredProvider.modelName ? { model: preferredProvider.modelName } : {}),
              };
              
              return agentLM.streamText(streamOptions);
            }),
            Effect.flatten
          )
        );
      },
      
      generateConversationResponse: ({ messages, preferredProvider, options }) => {
        Effect.runFork(runTelemetryEffect({ 
          category: "orchestrator", 
          action: "generate_conversation_start", 
          label: preferredProvider.key 
        }));
        
        return getProviderLanguageModel(preferredProvider.key, preferredProvider.modelName).pipe(
          Effect.flatMap((agentLM) => {
            const generateOptions = {
              ...options,
              prompt: JSON.stringify({ messages }),
              ...(preferredProvider.modelName ? { model: preferredProvider.modelName } : {}),
            };
            
            return agentLM.generateText(generateOptions).pipe(
              Effect.map(aiResponse => aiResponse.text)
            );
          })
        );
      },
    };
  })
);