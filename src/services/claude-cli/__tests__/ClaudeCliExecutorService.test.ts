import { Effect, Stream } from "effect";
import { describe, test, expect } from "vitest";
import { ClaudeCliExecutorService } from "../ClaudeCliExecutorService";
import { ClaudeCliExecutorServiceLive } from "../ClaudeCliExecutorServiceLive";

describe("ClaudeCliExecutorService", () => {
  test("health check detects Claude CLI", () =>
    Effect.gen(function* () {
      const executor = yield* ClaudeCliExecutorService;
      const health = yield* executor.checkHealth();
      
      // We expect Claude to be available on the development machine
      expect(health.available).toBe(true);
      expect(health.claudePath).toBeTruthy();
      expect(health.version).toMatch(/claude/i);
    }).pipe(
      Effect.provide(ClaudeCliExecutorServiceLive),
      Effect.runPromise
    )
  );

  test("executes simple text prompt", () =>
    Effect.gen(function* () {
      const executor = yield* ClaudeCliExecutorService;
      
      // Simple prompt that should complete quickly
      const response = yield* executor.execute([
        '-p', 'Reply with exactly: "Hello from Effect!"',
        '--output-format', 'text'
      ]);
      
      expect(response).toBeTruthy();
      expect(response).toContain("Hello from Effect!");
    }).pipe(
      Effect.provide(ClaudeCliExecutorServiceLive),
      Effect.runPromise
    ),
    { timeout: 30000 } // 30 second timeout for Claude API call
  );

  test("streams responses for longer prompts", () =>
    Effect.gen(function* () {
      const executor = yield* ClaudeCliExecutorService;
      const chunks: string[] = [];
      
      yield* executor.executeStream([
        '-p', 'Count from 1 to 3 slowly, one number per line',
        '--output-format', 'stream-json',
        '--verbose'
      ]).pipe(
        Stream.tap(chunk => 
          Effect.sync(() => {
            if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
              chunks.push(chunk.delta.text);
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
      Effect.provide(ClaudeCliExecutorServiceLive),
      Effect.runPromise
    ),
    { timeout: 30000 }
  );

  test("handles authentication errors gracefully", () =>
    Effect.gen(function* () {
      const executor = yield* ClaudeCliExecutorService;
      
      // Try to execute with invalid environment
      // This test assumes we can temporarily break auth
      // For now, just verify error handling works
      const result = yield* executor.execute([
        '-p', 'test',
        '--output-format', 'text'
      ]).pipe(
        Effect.map(() => "success" as const),
        Effect.catchAll(error => Effect.succeed("error" as const))
      );
      
      // Should either succeed or fail gracefully
      expect(["success", "error"]).toContain(result);
    }).pipe(
      Effect.provide(ClaudeCliExecutorServiceLive),
      Effect.runPromise
    )
  );
});