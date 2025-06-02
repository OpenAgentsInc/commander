// src/services/swe_bench_harness/cli-harness-layer.ts
/**
 * CLI-specific layer composition for SWE-Bench harness.
 * This avoids browser/Electron-specific dependencies and provides
 * CLI-compatible implementations.
 */

import { Layer, Effect, Context, Stream } from "effect";
import { NodeFileSystem, NodeHttpClient, NodePath } from "@effect/platform-node";
import { HttpClient, FileSystem, Path } from "@effect/platform";

// Configuration and Telemetry
import {
  ConfigurationService,
  ConfigurationServiceLive,
  DefaultDevConfigLayer,
} from "@/services/configuration";
import {
  TelemetryService,
  TelemetryServiceLive,
  TelemetryServiceConfigFromConfigurationLayer,
} from "@/services/telemetry";

// Docker service (needed for SWE-bench)
import {
  DockerUtilsService,
  DockerUtilsServiceLive,
} from "@/services/docker";

// SWE-Bench specific services
import {
  SWEBenchTaskService,
  SWEBenchTaskServiceLive,
  SWEBenchEvaluationScriptService,
  SWEBenchEvaluationScriptServiceLive,
  DockerBuildManagerService,
  DockerBuildManagerServiceLive,
  SWEBenchEnvironmentSetupService,
  SWEBenchEnvironmentSetupServiceLive,
  AgentPatchGeneratorService,
  AgentPatchGeneratorServiceLive,
  SWEBenchLifecycleService,
  SWEBenchLifecycleServiceLive,
  SWEBenchHarnessService,
  SWEBenchHarnessServiceLive,
} from "./index";

// AI Services needed by AgentPatchGeneratorService
import {
  ChatOrchestratorService,
} from "@/services/ai/orchestration";
import {
  OllamaService,
  OllamaServiceLive,
  UiOllamaConfigLive,
} from "@/services/ollama";
import * as OllamaProvider from "@/services/ai/providers/ollama";
import { AgentLanguageModel } from "@/services/ai/core";
import { AiResponse } from "@/services/ai/core/AiResponse";

// Import WebSocket for Claude Bridge communication in CLI
import WebSocket from 'ws';

// Mock database service for CLI (SWE-bench doesn't need DB)
import { DatabaseService } from "@/services/db";
const MockDatabaseServiceLive = Layer.succeed(
  DatabaseService,
  DatabaseService.of({
    _tag: "DatabaseService",
    initialize: Effect.void,
    query: () => Effect.succeed({ rows: [] }),
    execute: () => Effect.succeed({ rowsAffected: 0 }),
    getDB: () => Effect.succeed(null as any),
    close: Effect.void,
  })
);

// Create a CLI-specific Claude Code provider that uses WebSocket to talk to bridge
const createClaudeCodeCliProvider = (): AgentLanguageModel => {
  const wsUrl = 'ws://localhost:45671';
  
  return {
    _tag: "AgentLanguageModel",
    generateText: ({ prompt, ...params }) => Effect.tryPromise({
      try: async () => {
        const ws = new WebSocket(wsUrl);
        const requestId = `cli-${Date.now()}-${Math.random()}`;
        
        return new Promise<string>((resolve, reject) => {
          let fullResponse = '';
          
          ws.on('open', () => {
            ws.send(JSON.stringify({
              type: 'chat',
              requestId,
              messages: [
                ...(params.system ? [{ role: 'system', content: params.system }] : []),
                { role: 'user', content: prompt }
              ],
              stream: false
            }));
          });
          
          ws.on('message', (data) => {
            const message = JSON.parse(data.toString());
            if (message.requestId === requestId) {
              if (message.type === 'response') {
                fullResponse = message.content;
                ws.close();
                resolve(fullResponse);
              } else if (message.type === 'error') {
                ws.close();
                reject(new Error(message.error));
              }
            }
          });
          
          ws.on('error', (err) => {
            reject(err);
          });
          
          setTimeout(() => {
            ws.close();
            reject(new Error('WebSocket timeout'));
          }, 60000); // 60 second timeout
        });
        
        // Return proper AiResponse
        return AiResponse.fromSimple({ text: fullResponse });
      },
      catch: (error) => new Error(`Claude WebSocket error: ${error}`)
    }),
    
    streamText: ({ prompt, ...params }) => {
      // For now, implement a simple non-streaming version that returns a single chunk
      // A proper implementation would create a Stream directly from WebSocket events
      return Stream.fromEffect(
        Effect.tryPromise({
          try: async () => {
            const ws = new WebSocket(wsUrl);
            const requestId = `cli-${Date.now()}-${Math.random()}`;
            
            const response = await new Promise<string>((resolve, reject) => {
              let fullResponse = '';
              
              ws.on('open', () => {
                ws.send(JSON.stringify({
                  type: 'chat',
                  requestId,
                  messages: [
                    ...(params.system ? [{ role: 'system', content: params.system }] : []),
                    { role: 'user', content: prompt }
                  ],
                  stream: false
                }));
              });
              
              ws.on('message', (data) => {
                const message = JSON.parse(data.toString());
                if (message.requestId === requestId) {
                  if (message.type === 'response') {
                    fullResponse = message.content;
                    ws.close();
                    resolve(fullResponse);
                  } else if (message.type === 'error') {
                    ws.close();
                    reject(new Error(message.error));
                  }
                }
              });
              
              ws.on('error', (err) => {
                reject(err);
              });
              
              setTimeout(() => {
                ws.close();
                reject(new Error('WebSocket timeout'));
              }, 120000); // 2 minute timeout
            });
            
            // Return proper AiResponse
            return AiResponse.fromSimple({ text: response });
          },
          catch: (error) => new Error(`Claude WebSocket stream error: ${error}`)
        })
      );
    },
    
    generateStructured: () => Effect.die(new Error("Structured generation not implemented for Claude CLI"))
  };
};

// --- Layer Composition for CLI --- 

// 1. Platform layers - Node.js implementations
const CliPlatformLayer = Layer.mergeAll(
  NodeFileSystem.layer,
  NodeHttpClient.layerUndici,
  NodePath.layer
);

// 2. Configuration layer
const CliConfigLayer = DefaultDevConfigLayer.pipe(
  Layer.provide(ConfigurationServiceLive)
);

// 3. Telemetry layer with file system support
const CliTelemetryConfigLayer = TelemetryServiceConfigFromConfigurationLayer.pipe(
  Layer.provide(CliConfigLayer)
);

const CliTelemetryLayer = TelemetryServiceLive.pipe(
  Layer.provide(Layer.merge(CliTelemetryConfigLayer, NodeFileSystem.layer))
);

// 4. Base services layer combining config, telemetry, and platform
const CliBaseServicesLayer = Layer.mergeAll(
  CliConfigLayer,
  CliTelemetryLayer,
  CliPlatformLayer,
  MockDatabaseServiceLive
);

// 5. Docker layer for CLI
const CliDockerUtilsLayer = DockerUtilsServiceLive.pipe(
  Layer.provide(CliTelemetryLayer)
);

// 6. Ollama service layer
const CliOllamaServiceLayer = OllamaServiceLive.pipe(
  Layer.provide(Layer.mergeAll(
    UiOllamaConfigLive,
    NodeHttpClient.layerUndici,
    CliTelemetryLayer
  ))
);

// 7. Ollama provider layer
const CliOllamaAdapterLayer = OllamaProvider.OllamaAsOpenAIClientLive.pipe(
  Layer.provide(Layer.mergeAll(CliOllamaServiceLayer, CliTelemetryLayer))
);

const CliOllamaProviderLayer = OllamaProvider.OllamaAgentLanguageModelLiveLayer.pipe(
  Layer.provide(Layer.mergeAll(
    CliOllamaServiceLayer,
    CliOllamaAdapterLayer,
    CliTelemetryLayer,
    CliConfigLayer  // Added ConfigurationService which Ollama provider needs
  ))
);

// 8. Claude Code provider layer for CLI
const ClaudeCodeCliProviderLayer = Layer.effect(
  AgentLanguageModel.Tag,
  Effect.gen(function* (_) {
    // Check if claude bridge is running
    try {
      const ws = new WebSocket('ws://localhost:45671');
      yield* _(Effect.promise(() => new Promise<void>((resolve, reject) => {
        ws.on('open', () => {
          ws.close();
          resolve();
        });
        ws.on('error', () => {
          reject(new Error('Claude bridge not running'));
        });
        setTimeout(() => {
          ws.close();
          reject(new Error('Claude bridge connection timeout'));
        }, 5000);
      })));
      
      return createClaudeCodeCliProvider();
    } catch (error) {
      console.warn('[CLI Layer] Claude bridge not available, using stub provider');
      // Return stub provider if bridge not running
      return {
        _tag: "AgentLanguageModel",
        generateText: () => Effect.fail(new Error("Claude Code bridge not available")),
        streamText: () => Stream.fail(new Error("Claude Code bridge not available")),
        generateStructured: () => Effect.fail(new Error("Claude Code bridge not available"))
      };
    }
  })
).pipe(
  Layer.provide(CliBaseServicesLayer)
);

// 9. Simplified ChatOrchestrator for CLI (without Nostr dependencies)
const CliChatOrchestratorServiceLive = Effect.gen(function* (_) {
  const telemetry = yield* _(TelemetryService);
  const configService = yield* _(ConfigurationService);
  const ollamaProvider = yield* _(AgentLanguageModel.Tag);
  
  // Simple implementation that only supports ollama and claude_code
  return ChatOrchestratorService.of({
    _tag: "ChatOrchestratorService",
    
    streamConversation: ({ messages, preferredProvider, options = {} }) => {
      const prompt = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
      
      // For now, just use Ollama - Claude Code integration needs more work
      return ollamaProvider.streamText({ prompt, ...options });
    },
    
    generateConversationResponse: ({ messages, preferredProvider, options = {} }) => {
      const prompt = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
      
      // For now, just use Ollama - Claude Code integration needs more work
      return ollamaProvider.generateText({ prompt, ...options }).pipe(
        Effect.map(response => response.text)
      );
    }
  });
});

const CliChatOrchestratorLayer = Layer.effect(
  ChatOrchestratorService,
  CliChatOrchestratorServiceLive
).pipe(
  Layer.provide(Layer.mergeAll(
    CliBaseServicesLayer,
    CliOllamaProviderLayer
  ))
);

// 10. Agent patch generator layer
const CliAgentPatchGeneratorLayer = AgentPatchGeneratorServiceLive.pipe(
  Layer.provide(Layer.mergeAll(
    CliBaseServicesLayer,
    CliChatOrchestratorLayer
  ))
);

// 11. SWE-Bench specific layers
const CliSweBenchTaskLayer = SWEBenchTaskServiceLive.pipe(
  Layer.provide(CliBaseServicesLayer)
);

const CliSweBenchEnvSetupLayer = SWEBenchEnvironmentSetupServiceLive.pipe(
  Layer.provide(CliBaseServicesLayer)
);

const CliSweBenchEvalScriptLayer = SWEBenchEvaluationScriptServiceLive.pipe(
  Layer.provide(Layer.mergeAll(
    CliBaseServicesLayer,
    CliSweBenchEnvSetupLayer
  ))
);

const CliSweBenchDockerBuildMgrLayer = DockerBuildManagerServiceLive.pipe(
  Layer.provide(Layer.mergeAll(
    CliBaseServicesLayer,
    CliDockerUtilsLayer,
    CliSweBenchEnvSetupLayer
  ))
);

const CliSweBenchLifecycleLayer = SWEBenchLifecycleServiceLive.pipe(
  Layer.provide(Layer.mergeAll(
    CliBaseServicesLayer,
    CliDockerUtilsLayer,
    CliSweBenchDockerBuildMgrLayer,
    CliSweBenchEvalScriptLayer
  ))
);

// 12. Complete SWE-Bench harness layer for CLI
// Build the complete layer with proper dependency order
const AllBaseLayers = Layer.mergeAll(
  // Platform layers
  CliPlatformLayer,
  // Configuration
  CliConfigLayer,
  // Mock database
  MockDatabaseServiceLive,
  // Telemetry (depends on config and filesystem)
  CliTelemetryLayer,
  // Docker utils (depends on telemetry)
  CliDockerUtilsLayer,
  // Ollama services (depends on config, telemetry, http)
  CliOllamaServiceLayer,
  CliOllamaAdapterLayer,
  CliOllamaProviderLayer,
  // Claude Code provider
  ClaudeCodeCliProviderLayer,
  // Chat orchestrator (depends on providers)
  CliChatOrchestratorLayer,
  // Agent patch generator (depends on chat orchestrator)
  CliAgentPatchGeneratorLayer,
  // SWE-bench basic services
  CliSweBenchTaskLayer,
  CliSweBenchEnvSetupLayer,
  CliSweBenchEvalScriptLayer,
  CliSweBenchDockerBuildMgrLayer,
  CliSweBenchLifecycleLayer
);

// Finally add the harness service with all its dependencies
export const CLIFullSWEBenchHarnessLayer = SWEBenchHarnessServiceLive.pipe(
  Layer.provide(AllBaseLayers)
);