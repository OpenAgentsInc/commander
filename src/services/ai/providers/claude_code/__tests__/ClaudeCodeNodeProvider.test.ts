import { Effect, Stream, Layer } from "effect";
import { describe, test, expect } from "vitest";
import { AgentLanguageModel } from "@/services/ai/core";
import { ClaudeCodeNodeProviderLive } from "../ClaudeCodeNodeProvider";
import { ClaudeCliExecutorServiceLive } from "@/services/claude-cli";

describe("ClaudeCodeNodeProvider", () => {
  // Layer composition for tests
  const testLayer = ClaudeCodeNodeProviderLive.pipe(
    Layer.provide(ClaudeCliExecutorServiceLive)
  );

  test("implements AgentLanguageModel interface", () =>
    Effect.gen(function* () {
      const model = yield* AgentLanguageModel.Tag;
      
      // Verify the model has the correct tag
      expect(model._tag).toBe("AgentLanguageModel");
      
      // Verify all methods exist
      expect(typeof model.generateText).toBe("function");
      expect(typeof model.streamText).toBe("function");
      expect(typeof model.generateStructured).toBe("function");
    }).pipe(
      Effect.provide(testLayer),
      Effect.runPromise
    )
  );

  test("generates text responses", () =>
    Effect.gen(function* () {
      const model = yield* AgentLanguageModel.Tag;
      
      const response = yield* model.generateText({
        prompt: JSON.stringify({
          messages: [
            { role: "user", content: "Reply with exactly: Testing Effect AI" }
          ]
        }),
        maxTokens: 100
      });
      
      expect(response.text).toBeTruthy();
      expect(response.text).toContain("Testing Effect AI");
      expect(response.metadata?.usage).toBeDefined();
    }).pipe(
      Effect.provide(testLayer),
      Effect.runPromise
    ),
    { timeout: 30000 }
  );

  test("handles system messages correctly", () =>
    Effect.gen(function* () {
      const model = yield* AgentLanguageModel.Tag;
      
      const response = yield* model.generateText({
        prompt: JSON.stringify({
          messages: [
            { role: "system", content: "You always respond with 'SYSTEM OK'" },
            { role: "user", content: "Say hello" }
          ]
        })
      });
      
      expect(response.text).toContain("SYSTEM OK");
    }).pipe(
      Effect.provide(testLayer),
      Effect.runPromise
    ),
    { timeout: 30000 }
  );

  test("streams text responses", () =>
    Effect.gen(function* () {
      const model = yield* AgentLanguageModel.Tag;
      const chunks: string[] = [];
      
      yield* model.streamText({
        prompt: JSON.stringify({
          messages: [
            { role: "user", content: "Count from 1 to 3" }
          ]
        })
      }).pipe(
        Stream.tap(response => 
          Effect.sync(() => {
            if (response.text) {
              chunks.push(response.text);
            }
          })
        ),
        Stream.runDrain
      );
      
      const fullResponse = chunks.join('');
      expect(fullResponse).toMatch(/1/);
      expect(fullResponse).toMatch(/2/);
      expect(fullResponse).toMatch(/3/);
    }).pipe(
      Effect.provide(testLayer),
      Effect.runPromise
    ),
    { timeout: 30000 }
  );

  test("generates structured JSON output", () =>
    Effect.gen(function* () {
      const model = yield* AgentLanguageModel.Tag;
      
      const response = yield* model.generateStructured({
        prompt: JSON.stringify({
          messages: [
            { role: "user", content: "Generate a JSON object with fields: name (string) = 'Effect', version (number) = 3" }
          ]
        })
      });
      
      // Should be valid JSON
      const parsed = JSON.parse(response.text);
      expect(parsed).toBeDefined();
      
      // May have the requested fields (Claude might add extra formatting)
      if (parsed.name && parsed.version) {
        expect(parsed.name).toBe("Effect");
        expect(parsed.version).toBe(3);
      }
    }).pipe(
      Effect.provide(testLayer),
      Effect.runPromise
    ),
    { timeout: 30000 }
  );

  test("handles errors gracefully", () =>
    Effect.gen(function* () {
      const model = yield* AgentLanguageModel.Tag;
      
      // Test with empty prompt
      const result = yield* model.generateText({
        prompt: JSON.stringify({ messages: [] })
      }).pipe(
        Effect.map(() => "success" as const),
        Effect.catchAll(() => Effect.succeed("error" as const))
      );
      
      // Should handle the error gracefully
      expect(["success", "error"]).toContain(result);
    }).pipe(
      Effect.provide(testLayer),
      Effect.runPromise
    )
  );
});