import { describe, it, expect } from "vitest";
import { Effect, Layer, Context, Stream, Chunk } from "effect";
import { OpenAiClient, OpenAiLanguageModel } from "@effect/ai-openai";
import { AiLanguageModel } from "@effect/ai/AiLanguageModel";

describe("OpenAI Config Service Debug", () => {
  it("should understand how Config service is used during streaming", async () => {
    // Create a mock OpenAI client
    const mockOpenAiClient = {
      client: {
        createChatCompletion: () => Effect.succeed({
          id: "test",
          object: "chat.completion",
          created: Date.now(),
          model: "gpt-4",
          choices: [{
            message: { role: "assistant", content: "Test response" },
            finish_reason: "stop",
            index: 0
          }],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
        })
      },
      stream: () => Stream.fromIterable([{
        id: "test",
        object: "chat.completion.chunk",
        created: Date.now(),
        model: "gpt-4",
        choices: [{
          delta: { content: "Test" },
          finish_reason: null,
          index: 0
        }]
      }])
    };

    // Create the config service
    const modelConfig: OpenAiLanguageModel.Config.Service = {
      model: "gpt-4",
      temperature: 0.7,
      max_tokens: 2048
    };

    // Test 1: Direct model creation
    const program1 = Effect.gen(function* (_) {
      // Create the model with config
      const modelEffect = OpenAiLanguageModel.model("gpt-4", {
        temperature: 0.7,
        max_tokens: 2048
      });

      // Provide both Config and Client to the model effect
      const provider = yield* _(
        Effect.provideService(
          Effect.provideService(
            modelEffect,
            OpenAiLanguageModel.Config,
            modelConfig
          ),
          OpenAiClient.OpenAiClient,
          mockOpenAiClient
        )
      );

      // Try to use the provider for streaming
      const streamResult = yield* _(
        Stream.unwrap(
          provider.use(
            Effect.gen(function* (_) {
              const languageModel = yield* _(AiLanguageModel);
              return languageModel.streamText({
                prompt: { messages: [{ role: "user", content: "Hello" }] },
              });
            })
          )
        ).pipe(
          Stream.runCollect,
          Effect.map(Chunk.toArray)
        )
      );

      return streamResult;
    });

    // This test helps understand what context is available during provider.use()
    try {
      const result = await Effect.runPromise(program1);
      console.log("Stream result:", result);
    } catch (error) {
      console.error("Error during streaming:", error);
      // We expect this might fail with "Service not found: @effect/ai-openai/OpenAiLanguageModel/Config"
    }
  });

  it("should test different ways of providing Config service", async () => {
    const mockOpenAiClient = {
      client: {
        createChatCompletion: () => Effect.succeed({
          id: "test",
          object: "chat.completion",
          created: Date.now(),
          model: "gpt-4",
          choices: [{
            message: { role: "assistant", content: "Test response" },
            finish_reason: "stop",
            index: 0
          }],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
        })
      },
      stream: () => Stream.fromIterable([{
        id: "test",
        object: "chat.completion.chunk",
        created: Date.now(),
        model: "gpt-4",
        choices: [{
          delta: { content: "Test" },
          finish_reason: null,
          index: 0
        }]
      }])
    };

    const modelConfig: OpenAiLanguageModel.Config.Service = {
      model: "gpt-4",
      temperature: 0.7,
      max_tokens: 2048
    };

    // Test 2: Using Layer composition
    const configLayer = Layer.succeed(OpenAiLanguageModel.Config, modelConfig);
    const clientLayer = Layer.succeed(OpenAiClient.OpenAiClient, mockOpenAiClient);

    const program2 = Effect.gen(function* (_) {
      const modelEffect = OpenAiLanguageModel.model("gpt-4");
      const provider = yield* _(modelEffect);

      // Try streaming with the provider
      const streamResult = yield* _(
        Stream.unwrap(
          provider.use(
            Effect.gen(function* (_) {
              const languageModel = yield* _(AiLanguageModel);
              return languageModel.streamText({
                prompt: { messages: [{ role: "user", content: "Hello" }] },
              });
            })
          )
        ).pipe(
          Stream.runCollect,
          Effect.map(Chunk.toArray)
        )
      );

      return streamResult;
    });

    try {
      const result = await Effect.runPromise(
        program2.pipe(
          Effect.provide(Layer.mergeAll(configLayer, clientLayer))
        )
      );
      console.log("Layer-based stream result:", result);
    } catch (error) {
      console.error("Layer-based error:", error);
    }
  });
});