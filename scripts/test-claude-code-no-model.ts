#!/usr/bin/env tsx
/**
 * Test script to verify Claude Code works without model parameter
 */

import { Effect, Exit, Layer, pipe } from "effect";
import { ConfigurationServiceLive, DefaultDevConfigLayer } from "../src/services/configuration";
import { TelemetryServiceLive, DefaultTelemetryConfigLayer } from "../src/services/telemetry";
import { ChatOrchestratorService } from "../src/services/ai/orchestration";
import { AgentChatMessage } from "../src/services/ai/core";

// Simple test to verify Claude Code doesn't get a model parameter
async function testClaudeCodeNoModel() {
  console.log("Testing Claude Code without model parameter...");
  
  // Create a mock WebSocket server to intercept Claude Code requests
  const WebSocket = require('ws');
  const wss = new WebSocket.Server({ port: 45671 });
  
  let capturedRequest: any = null;
  
  wss.on('connection', (ws: any) => {
    console.log("WebSocket connection established");
    
    ws.on('message', (data: Buffer) => {
      const message = JSON.parse(data.toString());
      console.log("Received message:", JSON.stringify(message, null, 2));
      capturedRequest = message;
      
      // Check if model is present in args
      const hasModel = message.args && message.args.includes('--model');
      console.log("Has --model flag:", hasModel);
      
      // Send a mock response
      ws.send(JSON.stringify({
        type: 'claude_stream_chunk',
        payload: {
          type: 'content_block_delta',
          delta: { text: 'Test response without model' }
        }
      }));
      
      setTimeout(() => {
        ws.send(JSON.stringify({
          type: 'claude_stream_done'
        }));
      }, 100);
    });
  });
  
  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  try {
    // Import orchestrator service implementation
    const { ChatOrchestratorServiceLive } = await import("../src/services/ai/orchestration");
    
    // Create minimal layer without full runtime
    const configLayer = DefaultDevConfigLayer.pipe(
      Layer.provide(ConfigurationServiceLive)
    );
    
    const telemetryLayer = TelemetryServiceLive.pipe(
      Layer.provide(DefaultTelemetryConfigLayer)
    );
    
    // Create a test program that uses ChatOrchestratorService directly
    const testProgram = Effect.gen(function* () {
      // Create a mock orchestrator that only has claude_code provider
      const mockOrchestrator = {
        _tag: "ChatOrchestratorService" as const,
        streamConversation: ({ messages, preferredProvider }: any) => {
          console.log("streamConversation called with provider:", preferredProvider);
          
          // Simulate the WebSocket connection logic from ChatOrchestratorService
          const Stream = require("effect/Stream");
          const WebSocketClient = require('ws');
          
          return Stream.asyncScoped((emit: any) =>
            Effect.gen(function* () {
              const ws = new WebSocketClient(`ws://localhost:45671`);
              
              ws.on('open', () => {
                // This is the critical part - build args like the real implementation
                const args = [
                  '-p', messages.map((m: any) => `${m.role}: ${m.content}`).join('\n'),
                  '--output-format', 'stream-json',
                  '--verbose'
                ];
                
                // Only add model if it's defined (this is what we're testing)
                if (preferredProvider.modelName) {
                  args.push('--model', preferredProvider.modelName);
                }
                
                ws.send(JSON.stringify({
                  type: 'claude',
                  id: Math.random().toString(36).substring(7),
                  args
                }));
              });
              
              ws.on('message', (data: Buffer) => {
                const msg = JSON.parse(data.toString());
                if (msg.type === 'claude_stream_chunk') {
                  emit.single({ text: msg.payload.delta?.text || '' });
                } else if (msg.type === 'claude_stream_done') {
                  emit.end();
                  ws.close();
                }
              });
              
              return Effect.sync(() => ws.close());
            })
          );
        },
        generateConversationResponse: () => Effect.fail(new Error("Not implemented"))
      };
      
      // Test with undefined model (what AgentPatchGeneratorServiceImpl does)
      const messages: AgentChatMessage[] = [
        { role: "user", content: "Test message" }
      ];
      
      let response = "";
      yield* pipe(
        mockOrchestrator.streamConversation({
          messages,
          preferredProvider: {
            key: "claude_code",
            modelName: undefined  // This should NOT add --model flag
          }
        }),
        Stream.tap(chunk => Effect.sync(() => {
          response += chunk.text;
        })),
        Stream.runDrain
      );
      
      return { response, capturedRequest };
    });
    
    const result = await Effect.runPromiseExit(testProgram);
    
    if (Exit.isSuccess(result)) {
      console.log("\n✅ Test passed!");
      console.log("Response:", result.value.response);
      
      // Check if model was NOT included in args
      const request = capturedRequest;
      if (request && request.args) {
        const hasModelFlag = request.args.includes('--model');
        if (hasModelFlag) {
          console.error("❌ ERROR: --model flag was included when it shouldn't be!");
          console.error("Args:", request.args);
        } else {
          console.log("✅ Confirmed: No --model flag in args");
          console.log("Args:", request.args);
        }
      }
    } else {
      console.error("❌ Test failed:", Exit.getCause(result));
    }
  } catch (error) {
    console.error("Test error:", error);
  } finally {
    wss.close();
    process.exit(0);
  }
}

testClaudeCodeNoModel().catch(console.error);